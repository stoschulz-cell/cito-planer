const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const DB_FILE = path.join(__dirname, 'datenbank.json');

function datenLaden() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const dateiInhalt = fs.readFileSync(DB_FILE, 'utf8');
      const daten = JSON.parse(dateiInhalt);
      // Absicherung, dass alle Listen existieren
      if (!daten.mitarbeiterListe) daten.mitarbeiterListe = [];
      if (!daten.termine) daten.termine = [];
      if (!daten.wunschfreiListe) daten.wunschfreiListe = [];
      if (!daten.wunschtermineKlienten) daten.wunschtermineKlienten = [];
      if (!daten.naechsteTerminId) daten.naechsteTerminId = daten.termine.length + 1;
      if (!daten.naechsteWunschfreiId) daten.naechsteWunschfreiId = daten.wunschfreiListe.length + 1;
      if (!daten.naechsteKlientenWunschId) daten.naechsteKlientenWunschId = daten.wunschtermineKlienten.length + 1;
      return daten;
    }
  } catch (fehler) {
    console.error("Fehler beim Laden der Datenbank:", fehler);
  }

  return {
    mitarbeiterListe: [
      { name: "Steffi", passwort: "cito2026" }, { name: "Kofhal", passwort: "cito2026" },
      { name: "Wiegefe", passwort: "cito2026" }, { name: "Stephan", passwort: "cito2026" }
    ],
    termine: [],
    wunschfreiListe: [],
    wunschtermineKlienten: [],
    naechsteTerminId: 1,
    naechsteWunschfreiId: 1,
    naechsteKlientenWunschId: 1
  };
}

function datenSpeichern(daten) {
  fs.writeFileSync(DB_FILE, JSON.stringify(daten, null, 2), 'utf8');
}

let db = datenLaden();

app.get('/api/planer/dashboard', (req, res) => {
  res.json({ 
    mitarbeiter: db.mitarbeiterListe.map(m => m.name), 
    termine: db.termine, 
    wunschfrei: db.wunschfreiListe,
    wunschtermineKlienten: db.wunschtermineKlienten
  });
});

// Klienten-Wunschtermin im Pool anlegen
app.post('/api/planer/klienten-wunsch', (req, res) => {
  const { kunde, datum, von_uhrzeit, bis_uhrzeit, notiz } = req.body;
  db.wunschtermineKlienten.push({
    id: db.naechsteKlientenWunschId++,
    kunde, datum, von_uhrzeit, bis_uhrzeit, notiz
  });
  datenSpeichern(db);
  res.json({ success: true });
});

// Klienten-Wunschtermin aus Pool LÖSCHEN
app.delete('/api/planer/klienten-wunsch/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.wunschtermineKlienten = db.wunschtermineKlienten.filter(w => w.id !== id);
  datenSpeichern(db);
  res.json({ success: true });
});

// Wunschtermin in echten Termin umwandeln und ZUWEISEN
app.post('/api/planer/klienten-wunsch-zuweisen/:id', (req, res) => {
  const wunschId = parseInt(req.params.id);
  const { mitarbeiter } = req.body;
  
  const wunsch = db.wunschtermineKlienten.find(w => w.id === wunschId);
  if(!wunsch) return res.status(404).json({ error: "Wunsch nicht gefunden" });
  
  // Neuen echten Termin erzeugen
  const neuerTermin = {
    id: db.naechsteTerminId++,
    mitarbeiter: mitarbeiter,
    kunde: wunsch.kunde + (wunsch.notiz ? ` (${wunsch.notiz})` : ''),
    datum: wunsch.datum,
    von_uhrzeit: wunsch.von_uhrzeit,
    bis_uhrzeit: wunsch.bis_uhrzeit,
    status: "ENTWURF"
  };
  
  db.termine.push(neuerTermin);
  
  // Aus dem Pool entfernen
  db.wunschtermineKlienten = db.wunschtermineKlienten.filter(w => w.id !== wunschId);
  
  datenSpeichern(db);
  res.json({ success: true });
});

// --- RESTLICHE SYSTEM-ROUTEN ---
app.post('/api/auth/login', (req, res) => {
  const { name, passwort } = req.body;
  const user = db.mitarbeiterListe.find(m => m.name.toLowerCase() === name.trim().toLowerCase());
  if (!user || user.passwort !== passwort) return res.status(401).json({ error: "Falsch" });
  res.json({ success: true, name: user.name });
});
app.put('/api/mitarbeiter/termin-verschieben/:id', (req, res) => {
  const { neueVonUhrzeit, neueBisUhrzeit, neuesDatum } = req.body;
  const originalTermin = db.termine.find(t => t.id === parseInt(req.params.id));
  if (!originalTermin) return res.status(404).end();
  const abweichung = { id: db.naechsteTerminId++, mitarbeiter: originalTermin.mitarbeiter, kunde: originalTermin.kunde, datum: neuesDatum || originalTermin.datum, von_uhrzeit: neueVonUhrzeit || originalTermin.von_uhrzeit, bis_uhrzeit: neueBisUhrzeit || originalTermin.bis_uhrzeit, status: 'IST-ZEIT', original_id: originalTermin.id };
  originalTermin.status = 'ORIGINAL_GEÄNDERT'; db.termine.push(abweichung); datenSpeichern(db); res.json({ success: true });
});
app.post('/api/mitarbeiter/wunschfrei', (req, res) => {
  const { mitarbeiter, datum, von_uhrzeit, bis_uhrzeit, grund } = req.body;
  db.wunschfreiListe.push({ id: db.naechsteWunschfreiId++, mitarbeiter, datum, von_uhrzeit, bis_uhrzeit, grund, status: 'OFFEN' }); datenSpeichern(db); res.json({ message: "OK" });
});
app.post('/api/planer/wunschfrei/:id/:aktion', (req, res) => {
  const antrag = db.wunschfreiListe.find(w => w.id === parseInt(req.params.id));
  if (antrag) antrag.status = req.params.aktion === 'genehmigen' ? 'GENEHMIGT' : 'ABGELEHNT';
  datenSpeichern(db); res.json({ success: true });
});
app.post('/api/planer/termin', (req, res) => {
  const { mitarbeiter, kunde, datum, von_uhrzeit, bis_uhrzeit } = req.body;
  db.termine.push({ id: db.naechsteTerminId++, mitarbeiter, kunde, datum, von_uhrzeit, bis_uhrzeit, status: "ENTWURF" }); datenSpeichern(db); res.json({ success: true });
});
app.delete('/api/planer/termin/:id', (req, res) => {
  db.termine = db.termine.filter(t => t.id !== parseInt(req.params.id)); datenSpeichern(db); res.json({ success: true });
});
app.post('/api/planer/freigeben', (req, res) => {
  db.termine.forEach(t => { if (t.status === 'ENTWURF') t.status = 'FREIGEGEBEN'; }); datenSpeichern(db); res.json({ success: true });
});
app.post('/api/planer/mitarbeiter', (req, res) => {
  db.mitarbeiterListe.push({ name: req.body.name.trim(), passwort: "cito2026" }); datenSpeichern(db); res.json({ success: true });
});

app.listen(3000, () => console.log('Cito Care Server läuft fehlerfrei auf Port 3000'));