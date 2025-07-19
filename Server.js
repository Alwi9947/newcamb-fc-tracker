const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const db = new sqlite3.Database('players.db');

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// DB setup
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    price REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS match_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER,
    player_id INTEGER,
    paid BOOLEAN DEFAULT 0,
    UNIQUE(match_id, player_id)
  )`);
});

// Routes
app.get('/api/players', (req, res) => {
  db.all("SELECT * FROM players", (err, rows) => res.json(rows));
});

app.post('/api/players', (req, res) => {
  const { name } = req.body;
  db.run("INSERT INTO players (name) VALUES (?)", [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

app.get('/api/matches', (req, res) => {
  db.all("SELECT * FROM matches ORDER BY date DESC", (err, rows) => res.json(rows));
});

app.post('/api/matches', (req, res) => {
  const { date, price } = req.body;
  db.run("INSERT INTO matches (date, price) VALUES (?, ?)", [date, price], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, date, price });
  });
});

app.post('/api/match/:match_id/add-player', (req, res) => {
  const { match_id } = req.params;
  const { player_id } = req.body;
  db.run("INSERT OR IGNORE INTO match_players (match_id, player_id) VALUES (?, ?)", [match_id, player_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/match/:match_id/players', (req, res) => {
  const { match_id } = req.params;
  db.all(`
    SELECT p.id, p.name, mp.paid
    FROM match_players mp
    JOIN players p ON p.id = mp.player_id
    WHERE mp.match_id = ?
  `, [match_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/match/:match_id/toggle-paid', (req, res) => {
  const { match_id } = req.params;
  const { player_id, paid } = req.body;
  db.run(`
    UPDATE match_players
    SET paid = ?
    WHERE match_id = ? AND player_id = ?
  `, [paid ? 1 : 0, match_id, player_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
