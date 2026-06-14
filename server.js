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
    } catch (e) {
        console.error("Datenbank-Verbindungsfehler:", e);
    }
}
startServer();

// --- LOGIN ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { name, passwort } = req.body;
        const data = await db.collection('daten').findOne({ id: "main" });
        const inputName = name.trim().toLowerCase();
        const user = data.mitarbeiterListe.find(m => m.name.toLowerCase() === inputName);

        if (user && user.passwort === passwort) {
            const istPlaner = data.planerListe?.some(p => p.toLowerCase() === inputName);
            res.json({ success: true, name: user.name, role: istPlaner ? 'planer' : 'mitarbeiter' });
        } else {
            res.status(401).json({ error: "Falsche Anmeldedaten" });
        }
    } catch (e) { res.status(500).json({ error: "Server Fehler" }); }
});

// --- DASHBOARD ---
app.get('/api/planer/dashboard', async (req, res) => {
    try {
        const data = await db.collection('daten').findOne({ id: "main" });
        res.json(data || {});
    } catch (e) { res.status(500).json({ error: "Fehler beim Laden" }); }
});

// --- MITARBEITER VERSCHIEBEN (NEU: Original bleibt, aktuell wird gesetzt) ---
app.post('/api/mitarbeiter/verschieben', async (req, res) => {
    try {
        const { id, neueVon, neueBis } = req.body;
        await db.collection('daten').updateOne(
            { id: "main", "termine.id": Number(id) },
            { 
                $set: { 
                    "termine.$.aktuell": { von: neueVon, bis: neueBis },
                    "termine.$.hatAenderung": true 
                } 
            }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler beim Verschieben" }); }
});

// --- PLANER BESTÄTIGT ÄNDERUNG ---
app.post('/api/planer/termin/bestaetigen', async (req, res) => {
    try {
        const { id } = req.body;
        // Kopiere aktuell auf original und setze hatAenderung auf false
        const data = await db.collection('daten').findOne({ id: "main" });
        const term = data.termine.find(t => t.id === Number(id));
        
        await db.collection('daten').updateOne(
            { id: "main", "termine.id": Number(id) },
            { 
                $set: { 
                    "termine.$.original": term.aktuell,
                    "termine.$.hatAenderung": false 
                } 
            }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler bei Bestätigung" }); }
});

// --- FREIGABE ---
app.post('/api/planer/freigabe', async (req, res) => {
    try {
        const { kwId, status } = req.body;
        await db.collection('daten').updateOne({ id: "main" }, { $set: { [`freigaben.${kwId}`]: status } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler bei Freigabe" }); }
});

// --- TERMIN ANLEGEN ---
app.post('/api/planer/termin', async (req, res) => {
    try {
        const { mitarbeiter, kunde, datum, von_uhrzeit, bis_uhrzeit } = req.body;
        const neuerTermin = { 
            id: Date.now(), mitarbeiter, kunde, datum, 
            original: { von: von_uhrzeit, bis: bis_uhrzeit },
            aktuell: { von: von_uhrzeit, bis: bis_uhrzeit },
            hatAenderung: false 
        };
        await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: neuerTermin } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Fehler beim Speichern" }); }
});

// --- RESTLICHE ROUTEN (Löschen, MA anlegen etc. wie gehabt) ---
// ... (Die vorhandenen Routen für Löschen und Sortieren einfach hier beibehalten)