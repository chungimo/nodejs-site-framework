/**
 * Users DAO
 * ============================================
 *
 * CRUD operations for the users table.
 * Handles password hashing, API key generation, and verification.
 *
 * USAGE:
 *   const { users } = require('./db');
 *   const allUsers = users.getAll();
 *   const user = users.getByUsername('admin');
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getDatabase } = require('./connection');

const SALT_ROUNDS = 12;

const users = {
  getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, username, is_admin, created_at, last_login
      FROM users ORDER BY username
    `).all();
  },

  getById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, username, is_admin, api_key, api_key_last_four, api_key_created_at, created_at, last_login
      FROM users WHERE id = ?
    `).get(id);
  },

  getFullById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, username, password_hash, is_admin, must_change_password, api_key, api_key_last_four, api_key_created_at, created_at, last_login
      FROM users WHERE id = ?
    `).get(id);
  },

  clearMustChangePassword(id) {
    const db = getDatabase();
    db.prepare(`UPDATE users SET must_change_password = 0 WHERE id = ?`).run(id);
  },

  getByUsername(username) {
    const db = getDatabase();
    return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
  },

  getByApiKey(apiKey) {
    const db = getDatabase();
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    return db.prepare(`
      SELECT id, username, is_admin FROM users WHERE api_key = ?
    `).get(hashedKey);
  },

  async create(username, password, isAdmin = false) {
    const db = getDatabase();
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, is_admin)
      VALUES (?, ?, ?)
    `).run(username, hash, isAdmin ? 1 : 0);

    return { id: result.lastInsertRowid, username, isAdmin };
  },

  async update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.password !== undefined) {
      fields.push('password_hash = ?');
      values.push(await bcrypt.hash(updates.password, SALT_ROUNDS));
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

  delete(id) {
    const db = getDatabase();
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  },

  updateLastLogin(id) {
    const db = getDatabase();
    db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
  },

  generateApiKey(id) {
    const db = getDatabase();
    const apiKey = crypto.randomBytes(32).toString('hex');
    const lastFour = apiKey.slice(-4);
    const createdAt = new Date().toISOString();
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    db.prepare('UPDATE users SET api_key = ?, api_key_last_four = ?, api_key_created_at = ? WHERE id = ?')
      .run(hashedKey, lastFour, createdAt, id);

    return { apiKey, lastFour, createdAt };
  },

  revokeApiKey(id) {
    const db = getDatabase();
    db.prepare('UPDATE users SET api_key = NULL, api_key_last_four = NULL, api_key_created_at = NULL WHERE id = ?').run(id);
  }
};

module.exports = { users };
