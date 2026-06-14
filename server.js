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

// --- TERMIN ANLEGEN ---
app.post('/api/planer/termin', async (req, res) => {
    try {
        await db.collection('daten').updateOne(
            { id: "main" }, 
            { $push: { termine: { ...req.body, id: Date.now(), status: "ENTWURF" } } }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Fehler beim Speichern" });
    }
});