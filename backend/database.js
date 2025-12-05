const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database path - use environment variable or default to app directory
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'savings.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Create savings_pots table
  db.run(`
    CREATE TABLE IF NOT EXISTS savings_pots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      current_total REAL NOT NULL DEFAULT 0,
      target_amount REAL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pot_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      repeat_monthly INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (pot_id) REFERENCES savings_pots (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Database tables initialized.');
      // Seed initial users
      seedUsers();
    }
  });
}

// Seed initial users
function seedUsers() {
  const users = [
    { id: 'alex', name: 'Alex', email: 'alex@example.com' },
    { id: 'beth', name: 'Beth', email: 'beth@example.com' }
  ];

  users.forEach(user => {
    db.run(
      'INSERT OR IGNORE INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)',
      [user.id, user.name, user.email, new Date().toISOString()],
      (err) => {
        if (err) {
          console.error('Error seeding user:', err.message);
        }
      }
    );
  });
}

// Helper function to run queries with promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get single row
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to get all rows
function getAllRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  db,
  runQuery,
  getRow,
  getAllRows
};
