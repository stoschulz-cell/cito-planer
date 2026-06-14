const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function startServer() {
    await client.connect();
    db = client.db("CitoCareDB");
    app.listen(port, () => console.log(`Server läuft auf Port ${port}`));
}
startServer();

// LOGIN mit Rollentrennung
app.post('/api/auth/login', async (req, res) => {
    const { name, passwort } = req.body;
    const data = await db.collection('daten').findOne({ id: "main" });
    const user = data.mitarbeiterListe.find(m => m.name.toLowerCase() === name.toLowerCase());
    
    if (user && user.passwort === passwort) {
        const istPlaner = data.planerListe?.includes(user.name);
        res.json({ success: true, name: user.name, role: istPlaner ? 'planer' : 'mitarbeiter' });
    } else {
        res.status(401).json({ error: "Login fehlgeschlagen" });
    }
});

// DASHBOARD DATEN abrufen
app.get('/api/planer/dashboard', async (req, res) => {
    const data = await db.collection('daten').findOne({ id: "main" });
    res.json(data);
});

// TERMIN EINTRAGEN (Beispiel-Route)
app.post('/api/planer/termin', async (req, res) => {
    await db.collection('daten').updateOne({ id: "main" }, { $push: { termine: req.body } });
    res.json({ success: true });
});