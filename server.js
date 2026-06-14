const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// Nutzt das Verzeichnis, in dem die Dateien liegen
app.use(express.static(__dirname));

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db("CitoCareDB");
        app.listen(port, '0.0.0.0');
        console.log("Server läuft.");
    } catch (err) { console.error(err); }
}
startServer();

// Rollen-Login
app.post('/api/login', async (req, res) => {
    const { name } = req.body;
    const data = await db.collection('daten').findOne({ id: "main" });
    
    // Prüfen, ob der Name in der Planer- oder Mitarbeiterliste ist
    const isPlaner = data.planerListe && data.planerListe.includes(name);
    const isMitarbeiter = data.mitarbeiter.includes(name);
    
    if (isPlaner) res.json({ role: 'planer' });
    else if (isMitarbeiter) res.json({ role: 'mitarbeiter' });
    else res.status(401).json({ error: "Name nicht gefunden" });
});

// Dashboard Daten (gilt für beide Rollen)
app.get('/api/planer/dashboard', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" });
    res.json(data);
});

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
        console.log("Server läuft.");
    } catch (err) { console.error(err); }
}
startServer();

// --- ROLLEN-LOGIN ---
app.post('/api/login', async (req, res) => {
    const { name } = req.body;
    const data = await db.collection('daten').findOne({ id: "main" });
    const isPlaner = data.planerListe && data.planerListe.includes(name);
    const isMitarbeiter = data.mitarbeiter.includes(name);
    
    if (isPlaner) res.json({ role: 'planer' });
    else if (isMitarbeiter) res.json({ role: 'mitarbeiter' });
    else res.status(401).json({ error: "Name nicht gefunden" });
});

// --- DASHBOARD DATEN ---
app.get('/api/planer/dashboard', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" }) || 
                 { mitarbeiter: [], termine: [] };
    res.json(data);
});

// --- MITARBEITER LOGIK ---
app.post('/api/planer/mitarbeiter/update-order', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $set: { mitarbeiter: req.body.neueListe } });
    res.sendStatus(200);
});

app.delete('/api/planer/mitarbeiter/:name', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $pull: { mitarbeiter: decodeURIComponent(req.params.name) } });
    res.sendStatus(200);
});

// --- TERMIN LOGIK ---
app.post('/api/planer/termin', async (req, res) => {
    const termin = { id: Date.now(), ...req.body, status: 'PLANUNG' };
    await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: termin } }, { upsert: true });
    res.sendStatus(200);
});

app.post('/api/planer/verschieben', async (req, res) => {
    const { terminId, neuesDatum, neueVon, neueBis } = req.body;
    await db.collection('daten').updateOne({ id: "main", "termine.id": terminId }, { $set: { "termine.$.status": "ORIGINAL_GEÄNDERT" } });
    const data = await db.collection('daten').findOne({ id: "main" });
    const alterTermin = data.termine.find(t => t.id === terminId);
    const neuerTermin = { ...alterTermin, id: Date.now(), datum: neuesDatum, von_uhrzeit: neueVon, bis_uhrzeit: neueBis, status: 'IST-ZEIT' };
    await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: neuerTermin } });
    res.sendStatus(200);
});