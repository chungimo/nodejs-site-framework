/**
 * Settings Routes (Admin only)
 * ============================================
 *
 * ENDPOINTS:
 *   GET /settings - Get all settings
 *   PUT /settings - Update settings (body: { key: value, ... })
 */

const express = require('express');
const router = express.Router();
const auth = require('../auth');
const { logs, settings } = require('../db');

router.get('/', auth.requireAdmin, (req, res) => {
  try {
    const allSettings = settings.getAll();
    res.json(allSettings);
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.put('/', auth.requireAdmin, (req, res) => {
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

module.exports = router;
