/**
 * Database Module - Entry Point
 * ============================================
 *
 * Aggregates all database domain modules into a single import.
 *
 * USAGE:
 *   const { users, sessions, logs, settings } = require('./db');
 *
 * EXPORTS:
 *   getDatabase          - Raw SQLite database instance
 *   DB_PATH              - Path to the SQLite file
 *   users                - User CRUD: getAll, getById, getByUsername, create, update, delete, verifyPassword, generateApiKey, revokeApiKey
 *   sessions             - Session tracking: create, isValid, revoke, revokeAllForUser, cleanup
 *   logs                 - Log storage: add, getRecent, clearOld, clearAll
 *   settings             - KV store: get, set, getAll
 *   notificationChannels - Channel CRUD: getAll, get, getDecrypted, save, delete
 *   encryption           - AES-256-CBC: encrypt, decrypt
 *
 * CUSTOMIZATION:
 *   Add new domain modules in this directory and re-export here.
 */

const { getDatabase, DB_PATH } = require('./connection');
const { users } = require('./users');
const { sessions } = require('./sessions');
const { logs } = require('./logs');
const { settings } = require('./settings');
const { notificationChannels } = require('./notifications');
const { encryption } = require('./encryption');

// Initialize database on first require
getDatabase();

module.exports = {
  getDatabase,
  DB_PATH,
  users,
  sessions,
  logs,
  settings,
  notificationChannels,
  encryption
};
