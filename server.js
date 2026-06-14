const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db("CitoCareDB");
        console.log("Verbunden mit MongoDB!");
        app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
    } catch (e) { console.error("Datenbank-Verbindungsfehler:", e); }
}
startServer();

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { name, passwort } = req.body;
        const data = await db.collection('daten').findOne({ id: "main" });
        const user = data.mitarbeiterListe.find(m => m.name.toLowerCase() === name.trim().toLowerCase());
        if (user && user.passwort === passwort) {
            const istPlaner = data.planerListe?.some(p => p.toLowerCase() === name.trim().toLowerCase());
            res.json({ success: true, name: user.name, role: istPlaner ? 'planer' : 'mitarbeiter' });
        } else res.status(401).json({ error: "Falsche Anmeldedaten" });
    } catch (e) { res.status(500).json({ error: "Server Fehler" }); }
});

// --- DASHBOARD ---
app.get('/api/planer/dashboard', async (req, res) => {
    try {
        const data = await db.collection('daten').findOne({ id: "main" });
        res.json(data || {});
    } catch (e) { res.status(500).json({ error: "Fehler beim Laden" }); }
});

// --- TERMIN LOGIK ---
// ANGEPASSTE ROUTE: Unterstützt jetzt Datum, Start- und Endzeit
app.post('/api/mitarbeiter/verschieben-als-aenderung', async (req, res) => {
    try {
        const { id, neuesDatum, neueVon, neueBis } = req.body;
        await db.collection('daten').updateOne(
            { id: "main", "termine.id": Number(id) },
            { 
                $set: { 
                    "termine.$.aktuell": { datum: neuesDatum, von: neueVon, bis: neueBis },
                    "termine.$.datum": neuesDatum, // Aktualisiert auch das Haupt-Datumsfeld
                    "termine.$.hatAenderung": true 
                } 
            }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler beim Verschieben" }); }
});

// ROUTE FÜR PLANER: Bestätigt die Änderung
app.post('/api/planer/termin/bestaetigen', async (req, res) => {
    try {
        const { id } = req.body;
        const data = await db.collection('daten').findOne({ id: "main" });
        const term = data.termine.find(t => t.id === Number(id));
        
        await db.collection('daten').updateOne(
            { id: "main", "termine.id": Number(id) },
            { 
                $set: { 
                    "termine.$.original": term.aktuell, 
                    "termine.$.datum": term.aktuell.datum,
                    "termine.$.hatAenderung": false 
                } 
            }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler bei Bestätigung" }); }
});

app.post('/api/planer/termin', async (req, res) => {
    try {
        const { mitarbeiter, kunde, datum, von_uhrzeit, bis_uhrzeit } = req.body;
        const neuerTermin = { 
            id: Date.now(), mitarbeiter, kunde, datum, 
            original: { datum, von: von_uhrzeit, bis: bis_uhrzeit },
            aktuell: { datum, von: von_uhrzeit, bis: bis_uhrzeit },
            hatAenderung: false 
        };
        await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: neuerTermin } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler beim Anlegen" }); }
});

app.delete('/api/planer/termin/:id', async (req, res) => {
    try {
        await db.collection('daten').updateOne({ id: "main" }, { $pull: { termine: { id: Number(req.params.id) } } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler beim Löschen" }); }
});

// --- MITARBEITER VERWALTUNG ---
app.post('/api/planer/mitarbeiter', async (req, res) => {
    try {
        await db.collection('daten').updateOne({ id: "main" }, { $push: { mitarbeiterListe: { name: req.body.name, passwort: "cito2026" } } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler beim Anlegen" }); }
});

app.delete('/api/planer/mitarbeiter/:name', async (req, res) => {
    try {
        await db.collection('daten').updateOne({ id: "main" }, { $pull: { mitarbeiterListe: { name: req.params.name } } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler beim Löschen" }); }
});

app.post('/api/planer/mitarbeiter/sortieren', async (req, res) => {
    try {
        const { name, richtung } = req.body;
        const data = await db.collection('daten').findOne({ id: "main" });
        let liste = data.mitarbeiterListe;
        const idx = liste.findIndex(m => m.name === name);
        if (richtung === 'up' && idx > 0) [liste[idx], liste[idx-1]] = [liste[idx-1], liste[idx]];
        else if (richtung === 'down' && idx < liste.length - 1) [liste[idx], liste[idx+1]] = [liste[idx+1], liste[idx]];
        await db.collection('daten').updateOne({ id: "main" }, { $set: { mitarbeiterListe: liste } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler beim Sortieren" }); }
});

// --- FREIGABE ---
app.post('/api/planer/freigabe', async (req, res) => {
    try {
        const { kwId, status } = req.body;
        await db.collection('daten').updateOne({ id: "main" }, { $set: { [`freigaben.${kwId}`]: status } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler bei Freigabe" }); }
});