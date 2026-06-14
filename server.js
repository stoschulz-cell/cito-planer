const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Dein Connection-String (ersetze diesen ggf. durch die aktualisierte Version nach Passwortänderung!)
const uri = "mongodb+srv://stoschulz_db_user:ts4g13U0kA1LTB1U@cluster0.7ravkzz.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db("CitoCareDB");
        console.log("Erfolgreich mit MongoDB verbunden!");
        
        app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
    } catch (err) {
        console.error("Verbindungsfehler:", err);
    }
}
startServer();

// --- API ROUTES ---

// Dashboard Daten laden
app.get('/api/planer/dashboard', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" }) || { mitarbeiter: [], termine: [], wunschfrei: [], wunschtermineKlienten: [] };
    res.json(data);
});

// Mitarbeiter anlegen
app.post('/api/planer/mitarbeiter', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $push: { mitarbeiter: req.body.name } }, { upsert: true });
    res.sendStatus(200);
});

// Mitarbeiter löschen
app.delete('/api/planer/mitarbeiter/:name', async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    await db.collection('daten').updateOne({ id: "main" }, { $pull: { mitarbeiter: name } });
    res.sendStatus(200);
});

// Termin anlegen
app.post('/api/planer/termin', async (req, res) => {
    const termin = { id: Date.now(), ...req.body, status: 'PLANUNG' };
    await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: termin } }, { upsert: true });
    res.sendStatus(200);
});

// Termin löschen
app.delete('/api/planer/termin/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    await db.collection('daten').updateOne({ id: "main" }, { $pull: { termine: { id: id } } });
    res.sendStatus(200);
});

// Klienten-Wunsch anlegen
app.post('/api/planer/klienten-wunsch', async (req, res) => {
    const wunsch = { id: Date.now(), ...req.body };
    await db.collection('daten').updateOne({ id: "main" }, { $push: { wunschtermineKlienten: wunsch } }, { upsert: true });
    res.sendStatus(200);
});

// Wunsch löschen
app.delete('/api/planer/klienten-wunsch/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    await db.collection('daten').updateOne({ id: "main" }, { $pull: { wunschtermineKlienten: { id: id } } });
    res.sendStatus(200);
});