const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Middleware, um JSON-Daten zu verarbeiten
app.use(express.json());
app.use(express.static('public'));

// Dein Connection-String mit deinen Datenbank-Daten
const uri = "mongodb+srv://stoschulz_db_user:ts4g13U0kA1LTB1U@cluster0.7ravkzz.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

let db;

// Datenbank-Verbindung starten
async function startServer() {
    try {
        await client.connect();
        db = client.db("CitoCareDB"); // Name der Datenbank
        console.log("Erfolgreich mit MongoDB verbunden!");
        
        app.listen(port, () => {
            console.log(`Server läuft auf Port ${port}`);
        });
    } catch (err) {
        console.error("Verbindungsfehler:", err);
    }
}

startServer();

// ROUTE: Daten speichern (wird aufgerufen, wenn du Mitarbeiter verschiebst)
app.post('/api/save-plan', async (req, res) => {
    try {
        const neueDaten = req.body;
        // Speichert die Daten unter einer festen ID 'dienstplan_main'
        await db.collection('planung').updateOne(
            { id: "dienstplan_main" }, 
            { $set: { daten: neueDaten } }, 
            { upsert: true }
        );
        res.json({ message: "Daten erfolgreich gespeichert!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ROUTE: Daten laden (wird aufgerufen, wenn die Seite neu lädt)
app.get('/api/load-plan', async (req, res) => {
    try {
        const result = await db.collection('planung').findOne({ id: "dienstplan_main" });
        res.json(result ? result.daten : {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});