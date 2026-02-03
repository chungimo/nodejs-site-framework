/**
 * Site Framework - API Routes
 * ============================================
 *
 * USAGE:
 *   const frameworkRoutes = require('./site-framework/routes');
 *   app.use('/api', frameworkRoutes);
 *
 * ENDPOINTS:
 *
 * Authentication:
 *   POST /api/auth/login     - Login with username/password
 *   POST /api/auth/logout    - Logout (revoke token)
 *   POST /api/auth/refresh   - Refresh JWT token
 *   GET  /api/auth/me        - Get current user info
 *
 * Self-Service Account (Logged-in users):
 *   GET    /api/account         - Get current user's account info
 *   PUT    /api/account         - Update username/password
 *   POST   /api/account/api-key - Generate API key
 *   DELETE /api/account/api-key - Revoke API key
 *
 * Users (Admin only):
 *   GET    /api/users        - List all users
 *   POST   /api/users        - Create user
 *   GET    /api/users/:id    - Get user by ID
 *   PUT    /api/users/:id    - Update user
 *   DELETE /api/users/:id    - Delete user
 *   POST   /api/users/:id/api-key - Generate API key
 *
 * Logs (Admin only):
 *   GET    /api/logs         - Get recent logs
 *   DELETE /api/logs         - Clear old logs
 *
 * Settings (Admin only):
 *   GET    /api/settings     - Get all settings
 *   PUT    /api/settings     - Update settings
 *
 * Notification Channels (Admin only):
 *   GET    /api/notifications/channels       - Get all channels
 *   GET    /api/notifications/channels/:type - Get channel config
 *   PUT    /api/notifications/channels/:type - Save channel config
 *   POST   /api/notifications/channels/:type/test - Test channel
 *   DELETE /api/notifications/channels/:type - Delete channel
 */

const express = require('express');
const router = express.Router();
const auth = require('./auth');
const { users, logs, settings, notificationChannels } = require('./database');

// ============================================
// Authentication Routes
// ============================================

router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.authenticate, auth.logout);
router.post('/auth/refresh', auth.requireAuth, auth.refreshToken);
router.get('/auth/me', auth.requireAuth, auth.getCurrentUser);

// ============================================
// Self-Service Account Routes (Logged-in users)
// ============================================

/**
 * Get current user's account info
 */
router.get('/account', auth.requireAuth, (req, res) => {
  try {
    const user = users.getById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response = {
      id: user.id,
      username: user.username,
      isAdmin: !!user.is_admin,
      hasApiKey: !!user.api_key,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };

    // Include API key info if key exists
    if (user.api_key) {
      response.apiKeyLastFour = user.api_key_last_four;
      response.apiKeyCreatedAt = user.api_key_created_at;
    }

    res.json(response);
  } catch (err) {
    console.error('Error getting account:', err);
    res.status(500).json({ error: 'Failed to get account info' });
  }
});

/**
 * Update current user's account (username/password)
 */
router.put('/account', auth.requireAuth, (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = users.getByUsername(req.user.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};

    // If changing username
    if (username && username !== user.username) {
      // Check if new username is taken
      const existing = users.getByUsername(username);
      if (existing) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }
      updates.username = username;
    }

    // If changing password
    if (newPassword) {
      // Require current password for password changes
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      if (!users.verifyPassword(user, currentPassword)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      updates.password = newPassword;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    users.update(userId, updates);
    logs.add('info', `Account updated by user: ${user.username}`, userId);

    res.json({ success: true, username: updates.username || user.username });
  } catch (err) {
    console.error('Error updating account:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

/**
 * Generate API key for current user
 */
router.post('/account/api-key', auth.requireAuth, (req, res) => {
  const userId = req.user.id;

  try {
    const user = users.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hadExistingKey = !!user.api_key;
    const result = users.generateApiKey(userId);
    console.log('[API Key] Generated:', result);
    const { apiKey, lastFour, createdAt } = result;
    const clientIP = auth.getClientIP(req);

    // Log generate vs regenerate
    const logMessage = hadExistingKey
      ? `API key regenerated by user: ${user.username} (ending in ...${lastFour}) from IP: ${clientIP}`
      : `API key generated by user: ${user.username} (ending in ...${lastFour}) from IP: ${clientIP}`;
    console.log('[API Key] Logging:', logMessage);
    logs.add('info', logMessage, userId);

    res.json({ apiKey, lastFour, createdAt });
  } catch (err) {
    console.error('Error generating API key:', err);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

/**
 * Revoke current user's API key
 */
router.delete('/account/api-key', auth.requireAuth, (req, res) => {
  const userId = req.user.id;

  try {
    const user = users.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const lastFour = user.api_key_last_four || 'unknown';
    users.revokeApiKey(userId);
    const clientIP = auth.getClientIP(req);
    const logMessage = `API key revoked by user: ${user.username} (was ending in ...${lastFour}) from IP: ${clientIP}`;
    console.log('[API Key] Logging:', logMessage);
    logs.add('info', logMessage, userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Error revoking API key:', err);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ============================================
// User Management Routes (Admin only)
// ============================================

/**
 * List all users
 */
router.get('/users', auth.requireAdmin, (req, res) => {
  try {
    const allUsers = users.getAll();
    res.json(allUsers);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * Create a new user
 */
router.post('/users', auth.requireAdmin, (req, res) => {
  const { username, password, isAdmin } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if username exists
    const existing = users.getByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const user = users.create(username, password, isAdmin);
    logs.add('info', `User created: ${username}`, req.user.id);

    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Get user by ID
 */
router.get('/users/:id', auth.requireAdmin, (req, res) => {
  const user = users.getById(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

/**
 * Update user
 */
router.put('/users/:id', auth.requireAdmin, (req, res) => {
  const { username, password, isAdmin } = req.body;
  const userId = parseInt(req.params.id);

  const user = users.getById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent removing last admin
  if (user.is_admin && isAdmin === false) {
    const allUsers = users.getAll();
    const adminCount = allUsers.filter(u => u.is_admin).length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin user' });
    }
  }

  try {
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (password !== undefined) updates.password = password;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;

    users.update(userId, updates);
    logs.add('info', `User updated: ${user.username}`, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Delete user
 */
router.delete('/users/:id', auth.requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  const user = users.getById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent deleting yourself
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  // Prevent deleting last admin
  if (user.is_admin) {
    const allUsers = users.getAll();
    const adminCount = allUsers.filter(u => u.is_admin).length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }
  }

  try {
    users.delete(userId);
    logs.add('info', `User deleted: ${user.username}`, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * Generate API key for user
 */
router.post('/users/:id/api-key', auth.requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  const user = users.getById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const hadExistingKey = !!user.api_key;
    const result = users.generateApiKey(userId);
    console.log('[API Key Admin] Generated:', result);
    const { apiKey, lastFour, createdAt } = result;
    const clientIP = auth.getClientIP(req);

    // Log generate vs regenerate with admin info
    const logMessage = hadExistingKey
      ? `API key regenerated for user: ${user.username} by admin (ending in ...${lastFour}) from IP: ${clientIP}`
      : `API key generated for user: ${user.username} by admin (ending in ...${lastFour}) from IP: ${clientIP}`;
    console.log('[API Key Admin] Logging:', logMessage);
    logs.add('info', logMessage, req.user.id);

    res.json({ apiKey, lastFour, createdAt });
  } catch (err) {
    console.error('Error generating API key:', err);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// ============================================
// Logs Routes (Admin only)
// ============================================

/**
 * Get recent logs
 */
router.get('/logs', auth.requireAdmin, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const level = req.query.level || null;

  try {
    const entries = logs.getRecent(limit, level);
    res.json(entries);
  } catch (err) {
    console.error('Error getting logs:', err);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

/**
 * Clear logs
 * Query params:
 *   - all=true: Clear all logs
 *   - days=N: Clear logs older than N days (default 30)
 */
router.delete('/logs', auth.requireAdmin, (req, res) => {
  const clearAll = req.query.all === 'true';
  const days = parseInt(req.query.days) || 30;

  try {
    if (clearAll) {
      logs.clearAll();
      // Add a fresh log entry after clearing
      logs.add('info', `All logs cleared by admin`, req.user.id);
    } else {
      logs.clearOld(days);
      logs.add('info', `Cleared logs older than ${days} days`, req.user.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing logs:', err);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// ============================================
// Settings Routes (Admin only)
// ============================================

/**
 * Get all settings
 */
router.get('/settings', auth.requireAdmin, (req, res) => {
  try {
    const allSettings = settings.getAll();
    res.json(allSettings);
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * Update settings
 */
router.put('/settings', auth.requireAdmin, (req, res) => {
  const updates = req.body;

  try {
    for (const [key, value] of Object.entries(updates)) {
      settings.set(key, value);
    }

    logs.add('info', 'Settings updated', req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// Notification Channel Routes (Admin only)
// ============================================

/**
 * Get all notification channels
 */
router.get('/notifications/channels', auth.requireAdmin, (req, res) => {
  try {
    const channels = notificationChannels.getAll();
    res.json(channels);
  } catch (err) {
    console.error('Error getting notification channels:', err);
    res.status(500).json({ error: 'Failed to get notification channels' });
  }
});

/**
 * Get specific channel configuration
 */
router.get('/notifications/channels/:type', auth.requireAdmin, (req, res) => {
  try {
    const channel = notificationChannels.get(req.params.type);
    if (!channel) {
      return res.json({ channelType: req.params.type, enabled: false, config: {} });
    }
    res.json(channel);
  } catch (err) {
    console.error('Error getting notification channel:', err);
    res.status(500).json({ error: 'Failed to get notification channel' });
  }
});

/**
 * Save channel configuration
 */
router.put('/notifications/channels/:type', auth.requireAdmin, (req, res) => {
  const { enabled, ...config } = req.body;

  try {
    notificationChannels.save(req.params.type, enabled, config);
    logs.add('info', `Notification channel updated: ${req.params.type}`, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving notification channel:', err);
    res.status(500).json({ error: 'Failed to save notification channel' });
  }
});

/**
 * Test notification channel
 */
router.post('/notifications/channels/:type/test', auth.requireAdmin, async (req, res) => {
  const channelType = req.params.type;

  try {
    // Get channel config (with decrypted sensitive fields)
    let config = notificationChannels.getDecrypted(channelType);

    // If config provided in request, merge with stored config
    if (req.body && Object.keys(req.body).length > 0) {
      const { enabled, ...testConfig } = req.body;
      config = config ? { ...config.config, ...testConfig } : testConfig;
    } else if (config) {
      config = config.config;
    }

    if (!config) {
      return res.status(400).json({ error: 'Channel not configured' });
    }

    // Send test notification based on channel type
    const result = await sendTestNotification(channelType, config);

    if (result.success) {
      logs.add('info', `Test notification sent: ${channelType}`, req.user.id);
      res.json({ success: true, message: 'Test notification sent successfully' });
    } else {
      res.status(400).json({ error: result.error || 'Test failed' });
    }
  } catch (err) {
    console.error('Error testing notification channel:', err);
    res.status(500).json({ error: err.message || 'Failed to test notification channel' });
  }
});

/**
 * Delete channel configuration
 */
router.delete('/notifications/channels/:type', auth.requireAdmin, (req, res) => {
  try {
    notificationChannels.delete(req.params.type);
    logs.add('info', `Notification channel deleted: ${req.params.type}`, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting notification channel:', err);
    res.status(500).json({ error: 'Failed to delete notification channel' });
  }
});

/**
 * Send test notification helper
 */
async function sendTestNotification(channelType, config) {
  const testMessage = {
    title: 'Test Notification',
    text: 'This is a test notification from the site framework.',
    timestamp: new Date().toISOString()
  };

  switch (channelType) {
    case 'teams':
      return await sendTeamsNotification(config, testMessage);
    case 'slack':
      return await sendSlackNotification(config, testMessage);
    case 'discord':
      return await sendDiscordNotification(config, testMessage);
    case 'email':
      return await sendEmailNotification(config, testMessage);
    case 'webhook':
      return await sendWebhookNotification(config, testMessage);
    default:
      return { success: false, error: 'Unknown channel type' };
  }
}

/**
 * Send Teams notification via webhook
 */
async function sendTeamsNotification(config, message) {
  if (!config.webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: message.title,
      themeColor: '4ecca3',
      title: message.title,
      text: message.text
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return { success: true };
    } else {
      const text = await response.text();
      return { success: false, error: `Teams API error: ${text}` };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Slack notification via webhook
 */
async function sendSlackNotification(config, message) {
  if (!config.webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const payload = {
      text: `*${message.title}*\n${message.text}`
    };

    if (config.channel) payload.channel = config.channel;
    if (config.username) payload.username = config.username;

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return { success: true };
    } else {
      const text = await response.text();
      return { success: false, error: `Slack API error: ${text}` };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Discord notification via webhook
 */
async function sendDiscordNotification(config, message) {
  if (!config.webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const payload = {
      embeds: [{
        title: message.title,
        description: message.text,
        color: 0x4ecca3,
        timestamp: message.timestamp
      }]
    };

    if (config.username) payload.username = config.username;
    if (config.avatarUrl) payload.avatar_url = config.avatarUrl;

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 204) {
      return { success: true };
    } else {
      const text = await response.text();
      return { success: false, error: `Discord API error: ${text}` };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Email notification via SMTP
 */
async function sendEmailNotification(config, message) {
  // Email requires nodemailer which may not be installed
  // Return a placeholder - implement when nodemailer is available
  try {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: config.smtpServer,
      port: parseInt(config.smtpPort) || 587,
      secure: config.smtpPort === '465',
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword
      },
      tls: {
        rejectUnauthorized: config.useTls !== false
      }
    });

    const recipients = config.toAddresses.split(',').map(e => e.trim()).join(', ');

    await transporter.sendMail({
      from: config.fromAddress,
      to: recipients,
      subject: message.title,
      text: message.text
    });

    return { success: true };
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return { success: false, error: 'nodemailer not installed. Run: npm install nodemailer' };
    }
    return { success: false, error: err.message };
  }
}

/**
 * Send generic webhook notification
 */
async function sendWebhookNotification(config, message) {
  if (!config.webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const headers = { 'Content-Type': 'application/json' };

    // Add authentication
    if (config.authType === 'bearer' && config.authValue) {
      headers['Authorization'] = `Bearer ${config.authValue}`;
    } else if (config.authType === 'apikey' && config.authValue) {
      headers['X-Api-Key'] = config.authValue;
    } else if (config.authType === 'basic' && config.authValue) {
      headers['Authorization'] = `Basic ${Buffer.from(config.authValue).toString('base64')}`;
    }

    // Add custom headers
    if (config.customHeaders) {
      try {
        const customHeaders = JSON.parse(config.customHeaders);
        Object.assign(headers, customHeaders);
      } catch {
        // Invalid JSON, ignore custom headers
      }
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(message)
    });

    if (response.ok) {
      return { success: true };
    } else {
      const text = await response.text();
      return { success: false, error: `Webhook error: ${response.status} ${text}` };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = router;
