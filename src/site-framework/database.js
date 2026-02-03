/**
 * Site Framework - Database Module
 * ============================================
 *
 * USAGE:
 *   const db = require('./site-framework/database');
 *
 *   // Database auto-initializes on first require
 *   // Tables are created if they don't exist
 *
 * CUSTOMIZATION:
 * - Add new tables in initSchema()
 * - Modify DB_PATH for different location
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

const DB_DIR = path.join(__dirname, '../../db');
const DB_PATH = path.join(DB_DIR, 'app.db');
const SALT_ROUNDS = 12;

// ============================================
// Database Initialization
// ============================================

/**
 * Ensure database directory exists
 */
function ensureDbDirectory() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('[DB] Created database directory:', DB_DIR);
  }
}

/**
 * Initialize database connection
 */
function initDatabase() {
  ensureDbDirectory();

  const isNew = !fs.existsSync(DB_PATH);
  const db = new Database(DB_PATH);

  // Enable foreign keys
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

/**
 * Run database migrations for existing databases
 */
function runMigrations(db) {
  // Check if notification_channels table exists
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

  // Check columns for API key fields
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

    // Migrate existing plaintext API keys to hashed versions
    const usersWithKeys = db.prepare(`SELECT id, api_key FROM users WHERE api_key IS NOT NULL`).all();
    for (const user of usersWithKeys) {
      // Check if already hashed (hashes are 64 chars, plaintext keys are also 64 chars but this is a one-time migration)
      // We'll hash them and store last 4
      const lastFour = user.api_key.slice(-4);
      const hashedKey = crypto.createHash('sha256').update(user.api_key).digest('hex');
      db.prepare(`UPDATE users SET api_key = ?, api_key_last_four = ?, api_key_created_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(hashedKey, lastFour, user.id);
      console.log(`[DB] Migrated API key for user ${user.id}`);
    }
  }
}

/**
 * Initialize database schema
 */
function initSchema(db) {
  // Users table
  // Note: api_key stores SHA256 hash of the actual key (for security)
  // api_key_last_four stores last 4 chars for display purposes
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      api_key TEXT UNIQUE,
      api_key_last_four TEXT,
      api_key_created_at TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `);

  // Sessions table (for JWT blacklist/tracking)
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

  // Logs table
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

  // Settings table (key-value store)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notification channels table
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

/**
 * Seed default data
 */
function seedDefaultData(db) {
  // Create default admin user
  const adminPassword = 'admin'; // Change in production!
  const hash = bcrypt.hashSync(adminPassword, SALT_ROUNDS);

  try {
    db.prepare(`
      INSERT INTO users (username, password_hash, is_admin)
      VALUES (?, ?, 1)
    `).run('admin', hash);

    console.log('[DB] Created default admin user (username: admin, password: admin)');
    console.log('[DB] WARNING: Change the default admin password!');
  } catch (err) {
    // User might already exist
  }
}

// ============================================
// Database Instance (Singleton)
// ============================================

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

// ============================================
// User Functions
// ============================================

const users = {
  /**
   * Get all users (without password hashes)
   */
  getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, username, is_admin, created_at, last_login
      FROM users
      ORDER BY username
    `).all();
  },

  /**
   * Get user by ID
   */
  getById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, username, is_admin, api_key, api_key_last_four, api_key_created_at, created_at, last_login
      FROM users WHERE id = ?
    `).get(id);
  },

  /**
   * Get user by username (includes password hash for auth)
   */
  getByUsername(username) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM users WHERE username = ?
    `).get(username);
  },

  /**
   * Get user by API key (hashes the provided key for comparison)
   */
  getByApiKey(apiKey) {
    const db = getDatabase();
    // Hash the incoming API key to compare with stored hash
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    return db.prepare(`
      SELECT id, username, is_admin FROM users WHERE api_key = ?
    `).get(hashedKey);
  },

  /**
   * Create a new user
   */
  create(username, password, isAdmin = false) {
    const db = getDatabase();
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, is_admin)
      VALUES (?, ?, ?)
    `).run(username, hash, isAdmin ? 1 : 0);

    return { id: result.lastInsertRowid, username, isAdmin };
  },

  /**
   * Update user
   */
  update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.password !== undefined) {
      fields.push('password_hash = ?');
      values.push(bcrypt.hashSync(updates.password, SALT_ROUNDS));
    }
    if (updates.isAdmin !== undefined) {
      fields.push('is_admin = ?');
      values.push(updates.isAdmin ? 1 : 0);
    }
    if (updates.apiKey !== undefined) {
      fields.push('api_key = ?');
      values.push(updates.apiKey);
    }

    if (fields.length === 0) return false;

    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return true;
  },

  /**
   * Delete user
   */
  delete(id) {
    const db = getDatabase();
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  /**
   * Verify password
   */
  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  },

  /**
   * Update last login timestamp
   */
  updateLastLogin(id) {
    const db = getDatabase();
    db.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);
  },

  /**
   * Generate API key (stores hash, returns plaintext key to user once)
   */
  generateApiKey(id) {
    const db = getDatabase();
    // Generate random API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    const lastFour = apiKey.slice(-4);
    const createdAt = new Date().toISOString();
    // Hash the key for storage (never store plaintext)
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    db.prepare('UPDATE users SET api_key = ?, api_key_last_four = ?, api_key_created_at = ? WHERE id = ?')
      .run(hashedKey, lastFour, createdAt, id);

    // Return plaintext key (shown to user once) and metadata
    return { apiKey, lastFour, createdAt };
  },

  /**
   * Revoke API key
   */
  revokeApiKey(id) {
    const db = getDatabase();
    db.prepare('UPDATE users SET api_key = NULL, api_key_last_four = NULL, api_key_created_at = NULL WHERE id = ?').run(id);
  }
};

// ============================================
// Session Functions
// ============================================

const sessions = {
  /**
   * Create a new session
   */
  create(userId, tokenId, expiresAt) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO sessions (user_id, token_id, expires_at)
      VALUES (?, ?, ?)
    `).run(userId, tokenId, expiresAt);
  },

  /**
   * Check if token is valid (not revoked)
   */
  isValid(tokenId) {
    const db = getDatabase();
    const session = db.prepare(`
      SELECT * FROM sessions
      WHERE token_id = ? AND revoked = 0 AND expires_at > datetime('now')
    `).get(tokenId);
    return !!session;
  },

  /**
   * Revoke a session
   */
  revoke(tokenId) {
    const db = getDatabase();
    db.prepare('UPDATE sessions SET revoked = 1 WHERE token_id = ?').run(tokenId);
  },

  /**
   * Revoke all sessions for a user
   */
  revokeAllForUser(userId) {
    const db = getDatabase();
    db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(userId);
  },

  /**
   * Clean up expired sessions
   */
  cleanup() {
    const db = getDatabase();
    db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
  }
};

// ============================================
// Logs Functions
// ============================================

/**
 * Get current timestamp in Central Time (America/Chicago)
 * Returns format: YYYY-MM-DD HH:MM:SS
 */
function getCentralTime() {
  const options = {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
  const get = (type) => parts.find(p => p.type === type)?.value || '00';

  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

const logs = {
  /**
   * Add a log entry (timestamps in Central Time)
   */
  add(level, message, userId = null, metadata = null) {
    try {
      const db = getDatabase();
      const timestamp = getCentralTime();
      console.log('[Logs] Adding:', { timestamp, level, message, userId });
      db.prepare(`
        INSERT INTO logs (timestamp, level, message, user_id, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(timestamp, level, message, userId, metadata ? JSON.stringify(metadata) : null);
      console.log('[Logs] Added successfully');
    } catch (err) {
      console.error('[Logs] Error adding log:', err);
    }
  },

  /**
   * Get recent logs
   */
  getRecent(limit = 100, level = null) {
    const db = getDatabase();
    let query = 'SELECT * FROM logs';
    const params = [];

    if (level) {
      query += ' WHERE level = ?';
      params.push(level);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return db.prepare(query).all(...params);
  },

  /**
   * Clear old logs
   */
  clearOld(days = 30) {
    const db = getDatabase();
    db.prepare(`
      DELETE FROM logs WHERE timestamp < datetime('now', '-' || ? || ' days')
    `).run(days);
  },

  /**
   * Clear all logs
   */
  clearAll() {
    const db = getDatabase();
    db.prepare(`DELETE FROM logs`).run();
  }
};

// ============================================
// Settings Functions
// ============================================

const settings = {
  /**
   * Get a setting value
   */
  get(key, defaultValue = null) {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) return defaultValue;

    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  },

  /**
   * Set a setting value
   */
  set(key, value) {
    const db = getDatabase();
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, valueStr, valueStr);
  },

  /**
   * Get all settings
   */
  getAll() {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};

    rows.forEach(row => {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    });

    return result;
  }
};

// ============================================
// Encryption Utilities
// ============================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'change-this-key-in-production-32b';
const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey() {
  return Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
}

const encryption = {
  /**
   * Encrypt a string value
   */
  encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  /**
   * Decrypt an encrypted string
   */
  decrypt(encryptedText) {
    if (!encryptedText) return '';
    try {
      const [iv, encrypted] = encryptedText.split(':');
      const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(iv, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('Decryption error:', err.message);
      return '';
    }
  }
};

// ============================================
// Notification Channels Functions
// ============================================

// Sensitive fields that should be encrypted (by channel type)
const SENSITIVE_FIELDS = {
  teams: [],
  email: ['smtpPassword'],
  slack: [],
  discord: [],
  webhook: ['authValue']
};

const notificationChannels = {
  /**
   * Get all notification channels
   */
  getAll() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT channel_type, enabled, config, created_at, updated_at
      FROM notification_channels
    `).all();

    return rows.map(row => ({
      channelType: row.channel_type,
      enabled: !!row.enabled,
      config: this._parseConfig(row.channel_type, row.config, false),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  /**
   * Get a specific channel configuration
   */
  get(channelType) {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT channel_type, enabled, config, created_at, updated_at
      FROM notification_channels WHERE channel_type = ?
    `).get(channelType);

    if (!row) return null;

    return {
      channelType: row.channel_type,
      enabled: !!row.enabled,
      config: this._parseConfig(channelType, row.config, false),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  /**
   * Get channel config with decrypted sensitive fields (for sending notifications)
   */
  getDecrypted(channelType) {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT channel_type, enabled, config
      FROM notification_channels WHERE channel_type = ?
    `).get(channelType);

    if (!row) return null;

    return {
      channelType: row.channel_type,
      enabled: !!row.enabled,
      config: this._parseConfig(channelType, row.config, true)
    };
  },

  /**
   * Save channel configuration
   */
  save(channelType, enabled, config) {
    const db = getDatabase();

    // Get existing config with decrypted values to preserve sensitive fields not being updated
    const existing = this.getDecrypted(channelType);
    const existingConfig = existing ? existing.config : {};

    // Merge with existing config (preserve sensitive fields if not provided)
    const sensitiveFields = SENSITIVE_FIELDS[channelType] || [];
    const mergedConfig = { ...existingConfig };

    for (const [key, value] of Object.entries(config)) {
      if (sensitiveFields.includes(key)) {
        // Only update if new value provided
        if (value) {
          mergedConfig[key] = encryption.encrypt(value);
        }
        // Keep existing encrypted value if not provided
      } else {
        mergedConfig[key] = value;
      }
    }

    const configStr = JSON.stringify(mergedConfig);

    db.prepare(`
      INSERT INTO notification_channels (channel_type, enabled, config, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(channel_type) DO UPDATE SET
        enabled = ?,
        config = ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(channelType, enabled ? 1 : 0, configStr, enabled ? 1 : 0, configStr);
  },

  /**
   * Delete channel configuration
   */
  delete(channelType) {
    const db = getDatabase();
    db.prepare('DELETE FROM notification_channels WHERE channel_type = ?').run(channelType);
  },

  /**
   * Parse config JSON and handle sensitive fields
   * @param {string} channelType - Channel type
   * @param {string} configStr - JSON config string
   * @param {boolean} decrypt - Whether to decrypt sensitive fields
   */
  _parseConfig(channelType, configStr, decrypt) {
    if (!configStr) return {};

    try {
      const config = JSON.parse(configStr);
      const sensitiveFields = SENSITIVE_FIELDS[channelType] || [];

      if (decrypt) {
        // Decrypt sensitive fields
        for (const field of sensitiveFields) {
          if (config[field]) {
            config[field] = encryption.decrypt(config[field]);
          }
        }
      } else {
        // Mask sensitive fields for API response
        for (const field of sensitiveFields) {
          if (config[field]) {
            config[field] = '••••••••';
          }
        }
      }

      return config;
    } catch {
      return {};
    }
  }
};

// ============================================
// Exports
// ============================================

module.exports = {
  getDatabase,
  users,
  sessions,
  logs,
  settings,
  notificationChannels,
  encryption,
  DB_PATH
};
