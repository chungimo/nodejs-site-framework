/**
 * Auth Routes
 * ============================================
 *
 * ENDPOINTS:
 *   POST /auth/login            - Login with username/password
 *   POST /auth/logout           - Logout (revoke token)
 *   POST /auth/refresh          - Refresh JWT token
 *   GET  /auth/me               - Get current user info
 *   POST /auth/change-password  - Complete forced password change
 */

const express = require('express');
const router = express.Router();
const auth = require('../auth');
const { users, logs } = require('../db');

router.post('/login', auth.login);
router.post('/logout', auth.authenticate, auth.logout);
router.post('/refresh', auth.requireAuth, auth.refreshToken);
router.get('/me', auth.requireAuth, auth.getCurrentUser);

// Forced password change endpoint
router.post('/change-password', auth.requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const user = users.getFullById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!(await users.verifyPassword(user, currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Ensure new password is different from current
    if (await users.verifyPassword(user, newPassword)) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    await users.update(user.id, { password: newPassword });
    users.clearMustChangePassword(user.id);
    logs.add('info', `Password changed (forced): ${user.username}`, user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
