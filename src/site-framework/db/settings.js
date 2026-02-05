/**
 * Settings DAO
 * ============================================
 *
 * Key-value store for application settings.
 *
 * USAGE:
 *   const { settings } = require('./db');
 *   settings.set('siteName', 'My App');
 *   const name = settings.get('siteName', 'Default');
 *   const all = settings.getAll();
 */

const { getDatabase } = require('./connection');

const settings = {
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

  set(key, value) {
    const db = getDatabase();
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, valueStr, valueStr);
  },

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

module.exports = { settings };
