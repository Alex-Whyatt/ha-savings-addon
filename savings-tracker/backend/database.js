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
      repeat_weekly INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (pot_id) REFERENCES savings_pots (id) ON DELETE CASCADE
    )
  `);

  // Create upcoming_spends table (collaborative - all users can see all spends)
  db.run(`
    CREATE TABLE IF NOT EXISTS upcoming_spends (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurrence_interval TEXT,
      category_id TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES expense_categories (id) ON DELETE SET NULL
    )
  `);

  // Create expense_categories table (collaborative - all users can see/use all categories)
  db.run(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create budget_allocations table (one per user)
  db.run(`
    CREATE TABLE IF NOT EXISTS budget_allocations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      net_salary REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create budget_streams table (multiple streams per budget allocation)
  db.run(`
    CREATE TABLE IF NOT EXISTS budget_streams (
      id TEXT PRIMARY KEY,
      budget_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      is_auto_savings INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (budget_id) REFERENCES budget_allocations (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Database tables initialized.');
      // Run migrations for existing databases
      runMigrations();
      // Seed initial users
      seedUsers();
    }
  });
}

// Run migrations for existing databases
function runMigrations() {
  // Add repeat_weekly column if it doesn't exist
  db.run(`ALTER TABLE transactions ADD COLUMN repeat_weekly INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error:', err.message);
    } else if (!err) {
      console.log('Migration: Added repeat_weekly column');
    }
  });

  // Add category_id column to upcoming_spends if it doesn't exist
  db.run(`ALTER TABLE upcoming_spends ADD COLUMN category_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error:', err.message);
    } else if (!err) {
      console.log('Migration: Added category_id column to upcoming_spends');
    }
  });

  // Add interest_rate column to savings_pots if it doesn't exist (annual percentage rate)
  db.run(`ALTER TABLE savings_pots ADD COLUMN interest_rate REAL`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error:', err.message);
    } else if (!err) {
      console.log('Migration: Added interest_rate column to savings_pots');
    }
  });

  // Add parent_id column to budget_streams for hierarchical streams
  db.run(`ALTER TABLE budget_streams ADD COLUMN parent_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Migration error:', err.message);
    } else if (!err) {
      console.log('Migration: Added parent_id column to budget_streams');
    }
  });
}

// Get users from configuration or use defaults
function getConfiguredUsers() {
  const seedUsersEnv = process.env.SEED_USERS;
  
  if (seedUsersEnv) {
    try {
      const configuredUsers = JSON.parse(seedUsersEnv);
      if (Array.isArray(configuredUsers) && configuredUsers.length > 0) {
        console.log(`Using ${configuredUsers.length} user(s) from configuration`);
        return configuredUsers.map(user => ({
          id: user.id.toLowerCase(),
          name: user.name,
          email: user.email || `${user.id.toLowerCase()}@example.com`
        }));
      }
    } catch (err) {
      console.error('Error parsing SEED_USERS configuration:', err.message);
    }
  }
  
  // Default users for backward compatibility
  console.log('Using default users (alex, beth)');
  return [
    { id: 'alex', name: 'Alex', email: 'alex@example.com' },
    { id: 'beth', name: 'Beth', email: 'beth@example.com' }
  ];
}

// Seed initial users
function seedUsers() {
  const users = getConfiguredUsers();

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
