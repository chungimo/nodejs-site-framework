/**
 * Auth Routes
 * ============================================
 *
 * ENDPOINTS:
 *   POST /auth/login   - Login with username/password
 *   POST /auth/logout  - Logout (revoke token)
 *   POST /auth/refresh - Refresh JWT token
 *   GET  /auth/me      - Get current user info
 */

const express = require('express');
const router = express.Router();
const auth = require('../auth');

router.post('/login', auth.login);
router.post('/logout', auth.authenticate, auth.logout);
router.post('/refresh', auth.requireAuth, auth.refreshToken);
router.get('/me', auth.requireAuth, auth.getCurrentUser);

module.exports = router;
