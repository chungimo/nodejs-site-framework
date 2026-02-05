/**
 * Site Framework - Main Server Entry Point
 * ============================================
 *
 * A reusable web application framework providing:
 * - Authentication (JWT + API keys)
 * - User management
 * - Settings
 * - Logging
 * - Notification channels
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// Import site framework
const framework = require('./site-framework');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy configuration
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY);
}

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Api-Key']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Add framework API routes
app.use('/api', framework.routes);

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Site Framework is running',
        version: '1.0.0'
    });
});

// Serve index page for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    framework.logs.add('error', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Session cleanup on startup and hourly
framework.sessions.cleanup();
setInterval(() => framework.sessions.cleanup(), 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('  Site Framework Server');
    console.log('='.repeat(50));
    console.log(`  URL: http://localhost:${PORT}`);
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('='.repeat(50));
});

module.exports = app;
