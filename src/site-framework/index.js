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
 * INITIALIZATION:
 * The database is automatically initialized on first require.
 * Default admin user is created: admin/admin (change in production!)
 */

const database = require('./database');
const auth = require('./auth');
const routes = require('./routes');

// Initialize database on require
database.getDatabase();

module.exports = {
  // Database access
  db: database,
  users: database.users,
  sessions: database.sessions,
  logs: database.logs,
  settings: database.settings,

  // Authentication
  auth,

  // Express routes
  routes
};
