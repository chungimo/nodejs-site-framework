/**
 * Logs Routes (Admin only)
 * ============================================
 *
 * ENDPOINTS:
 *   GET    /logs - Get recent logs (query: ?limit=100&level=error)
 *   DELETE /logs - Clear logs (query: ?all=true or ?days=30)
 */

const express = require('express');
const router = express.Router();
const auth = require('../auth');
const { logs } = require('../db');

router.get('/', auth.requireAdmin, (req, res) => {
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

router.delete('/', auth.requireAdmin, (req, res) => {
  const clearAll = req.query.all === 'true';
  const days = parseInt(req.query.days) || 30;

  try {
    if (clearAll) {
      logs.clearAll();
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

module.exports = router;
