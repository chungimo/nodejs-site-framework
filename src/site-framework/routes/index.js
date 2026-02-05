/**
 * Routes - Entry Point
 * ============================================
 *
 * Mounts all domain-specific route modules onto a single router.
 *
 * USAGE:
 *   const routes = require('./routes');
 *   app.use('/api', routes);
 *
 * ENDPOINTS:
 *   /api/auth/*           - Authentication (login, logout, refresh, me)
 *   /api/account/*        - Self-service account management
 *   /api/users/*          - Admin user CRUD
 *   /api/logs/*           - Admin log management
 *   /api/settings/*       - Admin settings
 *   /api/notifications/*  - Admin notification channels
 *
 * CUSTOMIZATION:
 *   Add new route modules in this directory and mount them here.
 */

const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/account', require('./account'));
router.use('/users', require('./users'));
router.use('/logs', require('./logs'));
router.use('/settings', require('./settings'));
router.use('/notifications', require('./notifications'));

module.exports = router;
