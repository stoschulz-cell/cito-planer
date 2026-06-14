const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db("CitoCareDB");
        app.listen(port, '0.0.0.0');
        console.log("Server läuft auf Port " + port);
    } catch (err) { 
        console.error("Verbindungsfehler:", err); 
    }
}
startServer();

// --- LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    const { name } = req.body;
    const data = await db.collection('daten').findOne({ id: "main" });
    if (!data) return res.status(500).json({ error: "Datenbank leer" });
    
    const isPlaner = data.planerListe?.includes(name);
    const isMitarbeiter = data.mitarbeiter?.includes(name);
    
    if (isPlaner) res.json({ role: 'planer' });
    else if (isMitarbeiter) res.json({ role: 'mitarbeiter' });
    else res.status(401).json({ error: "Name nicht gefunden" });
});

// --- DASHBOARD DATEN ---
app.get('/api/planer/dashboard', async (req, res) => {
    try {
        const data = await db.collection('daten').findOne({ id: "main" });
        res.json(data || { 
            mitarbeiter: [], 
            termine: [], 
            wunschfrei: [], 
            wunschtermineKlienten: [] 
        });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden" });
    }
});

// --- NEUER TERMIN EINTRAGEN ---
app.post('/api/planer/termin-eintragen', async (req, res) => {
    try {
        const { mitarbeiter, kunde, datum } = req.body;
        await db.collection('daten').updateOne(
            { id: "main" },
            { $push: { termine: { mitarbeiter, kunde, datum } } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Eintragen" });
    }
});