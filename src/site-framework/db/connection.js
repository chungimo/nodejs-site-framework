/**
 * Database Connection & Schema
 * ============================================
 *
 * Manages SQLite database lifecycle: connection, schema creation,
 * migrations, and default data seeding.
 *
 * USAGE:
 *   const { getDatabase } = require('./connection');
 *   const db = getDatabase();
 *
 * NOTE: db/ folder is gitignored - databases are created per-deployment
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// ============================================
// Configuration
// ============================================

const DB_DIR = path.join(__dirname, '../../../db');
const DB_PATH = path.join(DB_DIR, 'app.db');
const SALT_ROUNDS = 12;

// ============================================
// Database Initialization
// ============================================

function ensureDbDirectory() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('[DB] Created database directory:', DB_DIR);
  }
}

function initDatabase() {
  ensureDbDirectory();

  const isNew = !fs.existsSync(DB_PATH);
  const db = new Database(DB_PATH);

  db.pragma('foreign_keys = ON');

  if (isNew) {
    console.log('[DB] Creating new database at:', DB_PATH);
    initSchema(db);
    seedDefaultData(db);
  } else {
    console.log('[DB] Connected to existing database:', DB_PATH);
    runMigrations(db);
  }

  return db;
}

// ============================================
// Schema & Migrations
// ============================================

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      api_key TEXT UNIQUE,
      api_key_last_four TEXT,
      api_key_created_at TEXT,
      is_admin INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_id TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      revoked INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      level TEXT DEFAULT 'info',
      message TEXT,
      user_id INTEGER,
      metadata TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_type TEXT UNIQUE NOT NULL,
      enabled INTEGER DEFAULT 0,
      config TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('[DB] Schema initialized');
}

function runMigrations(db) {
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='notification_channels'
  `).get();

  if (!tableExists) {
    console.log('[DB] Running migration: Adding notification_channels table');
    db.exec(`
      CREATE TABLE IF NOT EXISTS notification_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_type TEXT UNIQUE NOT NULL,
        enabled INTEGER DEFAULT 0,
        config TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  const columns = db.prepare(`PRAGMA table_info(users)`).all();
  const hasApiKeyCreatedAt = columns.some(c => c.name === 'api_key_created_at');
  const hasApiKeyLastFour = columns.some(c => c.name === 'api_key_last_four');

  if (!hasApiKeyCreatedAt) {
    console.log('[DB] Running migration: Adding api_key_created_at column');
    db.exec(`ALTER TABLE users ADD COLUMN api_key_created_at TEXT`);
  }

  if (!hasApiKeyLastFour) {
    console.log('[DB] Running migration: Adding api_key_last_four column');
    db.exec(`ALTER TABLE users ADD COLUMN api_key_last_four TEXT`);

    const usersWithKeys = db.prepare(`SELECT id, api_key FROM users WHERE api_key IS NOT NULL`).all();
    for (const user of usersWithKeys) {
      const lastFour = user.api_key.slice(-4);
      const hashedKey = crypto.createHash('sha256').update(user.api_key).digest('hex');
      db.prepare(`UPDATE users SET api_key = ?, api_key_last_four = ?, api_key_created_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(hashedKey, lastFour, user.id);
      console.log(`[DB] Migrated API key for user ${user.id}`);
    }
  }

  // Migration: Add must_change_password column
  const hasMustChangePassword = columns.some(c => c.name === 'must_change_password');
  if (!hasMustChangePassword) {
    console.log('[DB] Running migration: Adding must_change_password column');
    db.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0`);

    // Check if the admin user still has the default password
    const adminUser = db.prepare(`SELECT id, password_hash FROM users WHERE username = 'admin'`).get();
    if (adminUser && bcrypt.compareSync('admin', adminUser.password_hash)) {
      db.prepare(`UPDATE users SET must_change_password = 1 WHERE id = ?`).run(adminUser.id);
      console.log('[DB] Flagged admin user for required password change');
    }
  }
}

function seedDefaultData(db) {
  const adminPassword = 'admin';
  const hash = bcrypt.hashSync(adminPassword, SALT_ROUNDS);

  try {
    db.prepare(`
      INSERT INTO users (username, password_hash, is_admin, must_change_password)
      VALUES (?, ?, 1, 1)
    `).run('admin', hash);

    console.log('[DB] Created default admin user');
    console.log('[DB] NOTE: Password change will be required on first login');
  } catch (err) {
    // User might already exist
  }
}

// ============================================
// Singleton Instance
// ============================================

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

module.exports = { getDatabase, DB_PATH };
