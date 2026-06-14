const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
app.use(express.json());
app.use(express.static('.'));

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function startServer() {
    await client.connect();
    db = client.db("CitoCareDB");
    app.listen(3000, () => console.log('Server läuft.'));
}
startServer();

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { name, passwort } = req.body;
    const data = await db.collection('daten').findOne({ id: "main" });
    const user = data.mitarbeiterListe.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (user && user.passwort === passwort) {
        res.json({ success: true, role: data.planerListe?.includes(user.name) ? 'planer' : 'mitarbeiter' });
    } else {
        res.status(401).json({ error: "Login fehlgeschlagen" });
    }
});

// ALLE DATEN LADEN
app.get('/api/planer/dashboard', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" });
    res.json(data);
});

// MITARBEITER HINZUFÜGEN
app.post('/api/planer/mitarbeiter', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $push: { mitarbeiterListe: { name: req.body.name, passwort: "cito2026" } } });
    res.json({ success: true });
});