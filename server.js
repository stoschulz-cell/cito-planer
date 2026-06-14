const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const uri = "mongodb+srv://stoschulz_db_user:ts4g13U0kA1LTB1U@cluster0.7ravkzz.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db("CitoCareDB");
        console.log("Verbunden mit MongoDB!");
        app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
    } catch (err) { console.error(err); }
}
startServer();

// Die API-Routen für dein Dashboard
app.get('/api/planer/dashboard', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" }) || { mitarbeiter: [], termine: [], wunschfrei: [], wunschtermineKlienten: [] };
    res.json(data);
});

app.post('/api/planer/termin', async (req, res) => {
    const termin = { id: Date.now(), ...req.body };
    await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: termin } }, { upsert: true });
    res.sendStatus(200);
});

app.post('/api/planer/mitarbeiter', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $push: { mitarbeiter: req.body.name } }, { upsert: true });
    res.sendStatus(200);
});

// Füge hier weitere Routen hinzu (wie wunschfrei, klienten-wunsch etc.) nach dem gleichen Schema.