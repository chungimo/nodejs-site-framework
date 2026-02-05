/**
 * User Management Routes (Admin only)
 * ============================================
 *
 * ENDPOINTS:
 *   GET    /users            - List all users
 *   POST   /users            - Create user
 *   GET    /users/:id        - Get user by ID
 *   PUT    /users/:id        - Update user
 *   DELETE /users/:id        - Delete user
 *   POST   /users/:id/api-key - Generate API key for user
 */

const express = require('express');
const router = express.Router();
const auth = require('../auth');
const { users, logs } = require('../db');

router.get('/', auth.requireAdmin, (req, res) => {
  try {
    const allUsers = users.getAll();
    res.json(allUsers);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.post('/', auth.requireAdmin, (req, res) => {
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

router.get('/:id', auth.requireAdmin, (req, res) => {
  const user = users.getById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

router.put('/:id', auth.requireAdmin, (req, res) => {
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

router.delete('/:id', auth.requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  const user = users.getById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

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

router.post('/:id/api-key', auth.requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  const user = users.getById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const hadExistingKey = !!user.api_key;
    const result = users.generateApiKey(userId);
    const { apiKey, lastFour, createdAt } = result;
    const clientIP = auth.getClientIP(req);

    const logMessage = hadExistingKey
      ? `API key regenerated for user: ${user.username} by admin (ending in ...${lastFour}) from IP: ${clientIP}`
      : `API key generated for user: ${user.username} by admin (ending in ...${lastFour}) from IP: ${clientIP}`;
    logs.add('info', logMessage, req.user.id);

    res.json({ apiKey, lastFour, createdAt });
  } catch (err) {
    console.error('Error generating API key:', err);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

module.exports = router;
