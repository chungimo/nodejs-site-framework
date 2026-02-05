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

const SETTINGS_KEY_PATTERN = /^[a-zA-Z0-9._-]+$/;
const BLOCKED_KEYS = ['__proto__', 'constructor', 'prototype'];

router.put('/', auth.requireAdmin, (req, res) => {
  const updates = req.body;

  // Validate keys against prototype pollution and invalid patterns
  for (const key of Object.keys(updates)) {
    if (BLOCKED_KEYS.includes(key) || key.startsWith('__') || !SETTINGS_KEY_PATTERN.test(key)) {
      return res.status(400).json({ error: `Invalid setting key: ${key}` });
    }
  }

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
