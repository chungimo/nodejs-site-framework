/**
 * Sessions DAO
 * ============================================
 *
 * Manages JWT session tracking for token revocation.
 *
 * USAGE:
 *   const { sessions } = require('./db');
 *   sessions.create(userId, tokenId, expiresAt);
 *   sessions.isValid(tokenId);
 *   sessions.revoke(tokenId);
 */

const { getDatabase } = require('./connection');

const sessions = {
  create(userId, tokenId, expiresAt) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO sessions (user_id, token_id, expires_at)
      VALUES (?, ?, ?)
    `).run(userId, tokenId, expiresAt);
  },

  isValid(tokenId) {
    const db = getDatabase();
    const session = db.prepare(`
      SELECT * FROM sessions
      WHERE token_id = ? AND revoked = 0 AND expires_at > datetime('now')
    `).get(tokenId);
    return !!session;
  },

  revoke(tokenId) {
    const db = getDatabase();
    db.prepare('UPDATE sessions SET revoked = 1 WHERE token_id = ?').run(tokenId);
  },

  revokeAllForUser(userId) {
    const db = getDatabase();
    db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(userId);
  },

  cleanup() {
    const db = getDatabase();
    db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
  }
};

module.exports = { sessions };
