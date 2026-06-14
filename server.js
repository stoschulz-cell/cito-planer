const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

const uri = process.env.MONGO_URI; // Deine MongoDB Verbindungs-URL
const client = new MongoClient(uri);
let db;

async function startServer() {
    await client.connect();
    db = client.db("CitoCareDB"); // Dein Datenbank-Name
    console.log("Verbunden mit MongoDB!");
    app.listen(port, () => console.log('Server läuft auf Port ' + port));
}
startServer();

// Hilfsfunktion: Daten abrufen
async function getDB() {
    return await db.collection('daten').findOne({ id: "main" });
}

// Hilfsfunktion: Daten speichern
async function saveDB(data) {
    await db.collection('daten').updateOne({ id: "main" }, { $set: data }, { upsert: true });
}

// --- API ROUTEN ---
app.get('/api/planer/dashboard', async (req, res) => {
    const data = await getDB();
    res.json(data || { mitarbeiterListe: [], termine: [], wunschfreiListe: [], wunschtermineKlienten: [] });
});

app.post('/api/auth/login', async (req, res) => {
    const { name, passwort } = req.body;
    const data = await getDB();
    const user = data.mitarbeiterListe.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (user && user.passwort === passwort) res.json({ success: true, name: user.name });
    else res.status(401).json({ error: "Falsch" });
});

app.post('/api/planer/termin', async (req, res) => {
    const data = await getDB();
    data.termine.push({ ...req.body, id: Date.now(), status: "ENTWURF" });
    await saveDB(data);
    res.json({ success: true });
});

app.post('/api/mitarbeiter/wunschfrei', async (req, res) => {
    const data = await getDB();
    data.wunschfreiListe.push({ ...req.body, id: Date.now(), status: 'OFFEN' });
    await saveDB(data);
    res.json({ success: true });
});
