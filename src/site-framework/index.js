/**
 * Site Framework - Main Entry Point
 * ============================================
 *
 * USAGE:
 *   const framework = require('./site-framework');
 *
 *   // Add framework routes to your Express app
 *   app.use('/api', framework.routes);
 *
 *   // Use authentication middleware
 *   app.get('/protected', framework.auth.requireAuth, handler);
 *
 * EXPORTS:
 *   db       - Raw database module (getDatabase, DB_PATH, encryption)
 *   users    - User CRUD: getAll, getById, getByUsername, create, update, delete, verifyPassword, generateApiKey, revokeApiKey
 *   sessions - Session tracking: create, isValid, revoke, revokeAllForUser, cleanup
 *   logs     - Log storage: add, getRecent, clearOld, clearAll
 *   settings - KV store: get, set, getAll
 *   auth     - Middleware: authenticate, requireAuth, requireAdmin | Handlers: login, logout, getCurrentUser, refreshToken
 *   routes   - Express router, mount at /api
 *
 * INITIALIZATION:
 *   The database is automatically initialized on first require.
 *   Default admin user is created: admin/admin (change in production!)
 */

const db = require('./db');
const auth = require('./auth');
const routes = require('./routes');

module.exports = {
  // Database access
  db,
  users: db.users,
  sessions: db.sessions,
  logs: db.logs,
  settings: db.settings,

  // Authentication
  auth,

  // Express routes
  routes
};
