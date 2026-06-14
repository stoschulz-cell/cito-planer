const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Ersetze hier deinen URI (nachdem du das Passwort geändert hast!)
const uri = "mongodb+srv://stoschulz_db_user:ts4g13U0kA1LTB1U@cluster0.7ravkzz.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db("CitoCareDB");
        console.log("Verbunden mit MongoDB!");
        app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
    } catch (err) { console.error("Verbindungsfehler:", err); }
}
startServer();

// --- API ROUTES ---

app.get('/api/planer/dashboard', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" }) || 
                 { mitarbeiter: [], termine: [], wunschfrei: [], wunschtermineKlienten: [] };
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

app.post('/api/planer/freigeben', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" });
    if (data && data.termine) {
        const updatedTermine = data.termine.map(t => t.status === 'PLANUNG' ? { ...t, status: 'FREIGEGEBEN' } : t);
        await db.collection('daten').updateOne({ id: "main" }, { $set: { termine: updatedTermine } });
    }
    res.sendStatus(200);
});

app.post('/api/planer/klienten-wunsch', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $push: { wunschtermineKlienten: { id: Date.now(), ...req.body } } }, { upsert: true });
    res.sendStatus(200);
});

app.delete('/api/planer/klienten-wunsch/:id', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $pull: { wunschtermineKlienten: { id: parseInt(req.params.id) } } });
    res.sendStatus(200);
});

app.post('/api/planer/klienten-wunsch-zuweisen/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const data = await db.collection('daten').findOne({ id: "main" });
    const wunsch = data.wunschtermineKlienten.find(w => w.id === id);
    if (wunsch) {
        await db.collection('daten').updateOne({ id: "main" }, { $pull: { wunschtermineKlienten: { id: id } } });
        const termin = { id: Date.now(), mitarbeiter: req.body.mitarbeiter, kunde: wunsch.kunde, datum: wunsch.datum, von_uhrzeit: wunsch.von_uhrzeit, bis_uhrzeit: wunsch.bis_uhrzeit, status: 'PLANUNG' };
        await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: termin } }, { upsert: true });
    }
    res.sendStatus(200);
});

app.post('/api/planer/wunschfrei/:id/:aktion', async (req, res) => {
    const id = parseInt(req.params.id);
    const status = req.params.aktion === 'genehmigen' ? 'GENEHMIGT' : 'ABGELEHNT';
    await db.collection('daten').updateOne(
        { id: "main", "wunschfrei.id": id },
        { $set: { "wunschfrei.$.status": status } }
    );
    res.sendStatus(200);
});