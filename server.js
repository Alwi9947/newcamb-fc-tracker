const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Initialize SQLite DB
const db = new sqlite3.Database('./players.db', (err) => {
  if (err) {
    console.error('Could not connect to DB', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables if not exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      balance REAL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER,
      player_id INTEGER,
      paid INTEGER DEFAULT 0,
      FOREIGN KEY(match_id) REFERENCES matches(id),
      FOREIGN KEY(player_id) REFERENCES players(id)
    )
  `);
});

// Routes

// Get all players
app.get('/api/players', (req, res) => {
  db.all('SELECT * FROM players', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add a player
app.post('/api/players', (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.run('INSERT INTO players (name, phone) VALUES (?, ?)', [name, phone], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Get all matches
app.get('/api/matches', (req, res) => {
  db.all('SELECT * FROM matches ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a match
app.post('/api/matches', (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  db.run('INSERT INTO matches (date) VALUES (?)', [date], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Mark attendance and payment
app.post('/api/attendance', (req, res) => {
  const { match_id, player_id, paid } = req.body;
  if (!match_id || !player_id) return res.status(400).json({ error: 'match_id and player_id required' });

  // Check if attendance record exists
  db.get(
    'SELECT * FROM attendance WHERE match_id = ? AND player_id = ?',
    [match_id, player_id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (row) {
        // Update paid status
        db.run(
          'UPDATE attendance SET paid = ? WHERE id = ?',
          [paid ? 1 : 0, row.id],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: true });
          }
        );
      } else {
        // Insert new attendance record
        db.run(
          'INSERT INTO attendance (match_id, player_id, paid) VALUES (?, ?, ?)',
          [match_id, player_id, paid ? 1 : 0],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ inserted: true });
          }
        );
      }
    }
  );
});

// Get attendance for a match
app.get('/api/attendance/:match_id', (req, res) => {
  const match_id = req.params.match_id;
  db.all(
    `SELECT a.id, a.paid, p.id as player_id, p.name, p.phone 
     FROM attendance a 
     JOIN players p ON a.player_id = p.id 
     WHERE a.match_id = ?`,
    [match_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
