const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('./'));

const uri = process.env.MONGO_URI;
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

app.get('/api/planer/dashboard', async (req, res) => {
    let data = await db.collection('daten').findOne({ id: "main" }) || 
                 { mitarbeiter: [], termine: [], wunschfrei: [], wunschtermineKlienten: [] };
    res.json(data);
});

app.post('/api/planer/mitarbeiter', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $push: { mitarbeiter: req.body.name } }, { upsert: true });
    res.sendStatus(200);
});

app.post('/api/planer/mitarbeiter/update-order', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $set: { mitarbeiter: req.body.neueListe } });
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