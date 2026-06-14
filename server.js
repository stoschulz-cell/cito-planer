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

// --- LOGIN ROUTE ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { name, passwort } = req.body;
        const data = await db.collection('daten').findOne({ id: "main" });
        
        if (!data) return res.status(500).json({ error: "Datenbank nicht bereit" });

        const inputName = name.trim().toLowerCase();
        const user = data.mitarbeiterListe.find(m => m.name.toLowerCase() === inputName);

        if (user && user.passwort === passwort) {
            const istPlaner = data.planerListe?.some(p => p.toLowerCase() === inputName);
            res.json({ success: true, name: user.name, role: istPlaner ? 'planer' : 'mitarbeiter' });
        } else {
            res.status(401).json({ error: "Falsche Anmeldedaten" });
        }
    } catch (e) {
        res.status(500).json({ error: "Server Fehler" });
    }
});

// --- DASHBOARD ROUTE ---
app.get('/api/planer/dashboard', async (req, res) => {
    try {
        const data = await db.collection('daten').findOne({ id: "main" });
        res.json(data || {});
    } catch (e) {
        res.status(500).json({ error: "Fehler beim Laden" });
    }
});

// --- MITARBEITER ANLEGEN ---
app.post('/api/planer/mitarbeiter', async (req, res) => {
    try {
        await db.collection('daten').updateOne(
            { id: "main" }, 
            { $push: { mitarbeiterListe: { name: req.body.name, passwort: "cito2026" } } }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Fehler beim Speichern" });
    }
});

// --- MITARBEITER LÖSCHEN ---
app.delete('/api/planer/mitarbeiter/:name', async (req, res) => {
    try {
        const nameZuLoeschen = req.params.name;
        await db.collection('daten').updateOne(
            { id: "main" }, 
            { $pull: { mitarbeiterListe: { name: nameZuLoeschen } } }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Fehler beim Löschen" });
    }
});

// --- MITARBEITER SORTIEREN ---
app.post('/api/planer/mitarbeiter/sortieren', async (req, res) => {
    try {
        const { name, richtung } = req.body; // richtung: 'up' oder 'down'
        const data = await db.collection('daten').findOne({ id: "main" });
        let liste = data.mitarbeiterListe;
        const index = liste.findIndex(m => m.name === name);

        if (richtung === 'up' && index > 0) {
            [liste[index], liste[index - 1]] = [liste[index - 1], liste[index]];
        } else if (richtung === 'down' && index < liste.length - 1) {
            [liste[index], liste[index + 1]] = [liste[index + 1], liste[index]];
        }

        await db.collection('daten').updateOne({ id: "main" }, { $set: { mitarbeiterListe: liste } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Fehler beim Sortieren" });
    }
});

// --- TERMIN ANLEGEN ---
app.post('/api/planer/termin', async (req, res) => {
    try {
        const { mitarbeiter, kunde, datum, von_uhrzeit, bis_uhrzeit } = req.body;
        await db.collection('daten').updateOne(
            { id: "main" }, 
            { $push: { termine: { id: Date.now(), mitarbeiter, kunde, datum, von_uhrzeit, bis_uhrzeit, status: "ENTWURF" } } }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Fehler beim Speichern" });
    }
});

// --- TERMIN LÖSCHEN ---
app.delete('/api/planer/termin/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await db.collection('daten').updateOne(
            { id: "main" }, 
            { $pull: { termine: { id: id } } }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Fehler beim Löschen des Termins" });
    }
});