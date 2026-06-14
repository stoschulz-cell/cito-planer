const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const uri = "mongodb+srv://stoschulz_db_user:DEIN_PASSWORT_HIER@cluster0.7ravkzz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);
let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db("CitoCareDB");
        console.log("Cito Care Server läuft fehlerfrei auf Port 3000");
        app.listen(port, '0.0.0.0');
    } catch (err) { console.error("Verbindungsfehler:", err); }
}
startServer();

// Dashboard Daten mit Sortierung abrufen
app.get('/api/planer/dashboard', async (req, res) => {
    let data = await db.collection('daten').findOne({ id: "main" }) || 
                 { mitarbeiter: [], termine: [], wunschfrei: [], wunschtermineKlienten: [] };
    
    // Mitarbeiter sortieren: So bleiben sie an der gewünschten Position
    if (data.mitarbeiter) {
        data.mitarbeiter.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }
    res.json(data);
});

app.post('/api/planer/mitarbeiter', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $push: { mitarbeiter: req.body.name } }, { upsert: true });
    res.sendStatus(200);
});

app.delete('/api/planer/mitarbeiter/:name', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $pull: { mitarbeiter: decodeURIComponent(req.params.name) } });
    res.sendStatus(200);
});

app.post('/api/planer/termin', async (req, res) => {
    const termin = { id: Date.now(), ...req.body, status: 'PLANUNG' };
    await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: termin } }, { upsert: true });
    res.sendStatus(200);
});

app.delete('/api/planer/termin/:id', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $pull: { termine: { id: parseInt(req.params.id) } } });
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

app.post('/api/planer/freigeben', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" });
    const updatedTermine = data.termine.map(t => t.status === 'PLANUNG' ? { ...t, status: 'FREIGEGEBEN' } : t);
    await db.collection('daten').updateOne({ id: "main" }, { $set: { termine: updatedTermine } });
    res.sendStatus(200);
});