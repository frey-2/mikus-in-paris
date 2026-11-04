const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Helper na bezpečné čítanie z databázy
function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultData = { topics: [], topicTodos: {}, musicPresets: [], authorPin: "7567" };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Chyba čítania DB:", err);
    return { topics: [], topicTodos: {}, musicPresets: [], authorPin: "7567" };
  }
}

// Helper na zápis do databázy
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Chyba zápisu do DB:", err);
    return false;
  }
}

// Middleware na overenie autorského PIN kódu pre zápis
function requireAuthor(req, res, next) {
  const clientPin = req.headers['x-author-pin'];
  const db = readDatabase();
  if (db.authorPin && clientPin !== db.authorPin) {
    return res.status(403).json({ error: "Prístup odmietnutý: Nesprávny autorský PIN." });
  }
  next();
}

// ==========================================
// REST API ENDPOINTY (Čo požadoval učiteľ)
// ==========================================

// 1. Získanie celkového stavu aplikácie
app.get('/api/state', (req, res) => {
  const db = readDatabase();
  res.json({
    topics: db.topics,
    topicTodos: db.topicTodos,
    musicPresets: db.musicPresets,
    hasAuthorPin: !!db.authorPin
  });
});

// 2. Overenie autorského PINu
app.post('/api/auth/verify', (req, res) => {
  const { pin } = req.body;
  const db = readDatabase();
  if (!db.authorPin || db.authorPin === pin) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: "Nesprávny PIN" });
});

// 3. Zmena autorského PINu
app.post('/api/auth/change-pin', requireAuthor, (req, res) => {
  const { newPin } = req.body;
  const db = readDatabase();
  db.authorPin = newPin ? String(newPin).trim() : "";
  writeDatabase(db);
  res.json({ success: true, message: "PIN úspešne zmenený." });
});

// 4. Uloženie / Aktualizácia tém (Topics)
app.post('/api/topics', requireAuthor, (req, res) => {
  const { topics } = req.body;
  if (!Array.isArray(topics)) {
    return res.status(400).json({ error: "Neplatný formát tém." });
  }
  const db = readDatabase();
  db.topics = topics;
  writeDatabase(db);
  res.json({ success: true, count: topics.length });
});

// 5. Uloženie to-do úloh
app.post('/api/todos', requireAuthor, (req, res) => {
  const { topicTodos } = req.body;
  const db = readDatabase();
  db.topicTodos = topicTodos || {};
  writeDatabase(db);
  res.json({ success: true });
});

// 6. Uloženie hudobných tém (Presets)
app.post('/api/music', requireAuthor, (req, res) => {
  const { musicPresets } = req.body;
  const db = readDatabase();
  db.musicPresets = musicPresets || [];
  writeDatabase(db);
  res.json({ success: true, count: db.musicPresets.length });
});

// Obsluha hlavnej stránky
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` 🗼 Mikus in Paris 2.0 Server beží na porte ${PORT}`);
  console.log(` Lokálna adresa: http://localhost:${PORT}`);
  console.log(` Databáza: ${DB_FILE}`);
  console.log(`===============================================`);
});

