const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const db = new sqlite3.Database('players.db');

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create DB tables and insert default players
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  // Add default players if none exist
  db.get("SELECT COUNT(*) as count FROM players", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO players (name) VALUES (?)");
      ["Ali", "Jay", "Mo", "Ben", "Chris"].forEach(name => {
        stmt.run(name);
      });
      stmt.finalize();
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER,
    player_id INTEGER,
    paid BOOLEAN,
    UNIQUE(match_id, player_id)
  )`);
});

// Routes
app.get('/api/players', (req, res) => {
  db.all("SELECT * FROM players", (err, rows) => {
    res.json(rows);
  });
});

app.get('/api/matches', (req, res) => {
  db.all("SELECT * FROM matches ORDER BY date DESC", (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/matches', (req, res) => {
  const { date } = req.body;
  db.run("INSERT INTO matches (date) VALUES (?)", [date], function (err) {
    res.json({ id: this.lastID, date });
  });
});

app.get('/api/attendance/:match_id', (req, res) => {
  const match_id = req.params.match_id;
  db.all(`
    SELECT p.id as player_id, p.name, COALESCE(a.paid, 0) as paid
    FROM players p
    LEFT JOIN attendance a ON p.id = a.player_id AND a.match_id = ?
  `, [match_id], (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/attendance', (req, res) => {
  const { match_id, player_id, paid } = req.body;
  db.run(`
    INSERT INTO attendance (match_id, player_id, paid)
    VALUES (?, ?, ?)
    ON CONFLICT(match_id, player_id)
    DO UPDATE SET paid = excluded.paid
  `, [match_id, player_id, paid ? 1 : 0], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

