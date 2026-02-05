/**
 * Logs DAO
 * ============================================
 *
 * Application log storage with Central Time timestamps.
 *
 * USAGE:
 *   const { logs } = require('./db');
 *   logs.add('info', 'User logged in', userId);
 *   logs.getRecent(100, 'error');
 *   logs.clearAll();
 */

const { getDatabase } = require('./connection');

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

/**
 * Sanitize user-controlled input for log messages.
 * Strips control characters that could be used for log injection.
 */
function sanitizeLogInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[\r\n\t\x00-\x1f\x7f]/g, ' ');
}

const logs = {
  add(level, message, userId = null, metadata = null) {
    try {
      const db = getDatabase();
      const timestamp = getCentralTime();
      const sanitizedMessage = sanitizeLogInput(message);
      db.prepare(`
        INSERT INTO logs (timestamp, level, message, user_id, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(timestamp, level, sanitizedMessage, userId, metadata ? JSON.stringify(metadata) : null);
    } catch (err) {
      console.error('[Logs] Error adding log:', err);
    }
  },

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

  clearOld(days = 30) {
    const db = getDatabase();
    db.prepare(`
      DELETE FROM logs WHERE timestamp < datetime('now', '-' || ? || ' days')
    `).run(days);
  },

  clearAll() {
    const db = getDatabase();
    db.prepare(`DELETE FROM logs`).run();
  }
};

module.exports = { logs };
