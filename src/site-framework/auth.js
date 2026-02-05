/**
 * Site Framework - Authentication Module
 * ============================================
 *
 * USAGE:
 *   const auth = require('./site-framework/auth');
 *
 *   // Login endpoint
 *   app.post('/api/auth/login', auth.login);
 *
 *   // Protected route
 *   app.get('/api/protected', auth.requireAuth, (req, res) => {
 *     // req.user contains authenticated user
 *   });
 *
 *   // Admin-only route
 *   app.get('/api/admin', auth.requireAdmin, (req, res) => { ... });
 *
 * SECURITY:
 * - JWT tokens with configurable expiry
 * - bcrypt password hashing (handled in db/users.js)
 * - Session tracking for token revocation
 * - API key authentication support
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { users, sessions, logs } = require('./db');

// ============================================
// Configuration
// ============================================

// JWT secret - should be set via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Warn if using generated secret
if (!process.env.JWT_SECRET) {
  console.log('[AUTH] WARNING: Using generated JWT secret. Set JWT_SECRET env var for production.');
}

// Cookie options for httpOnly token storage
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };
}

/**
 * Parse JWT_EXPIRY string (e.g. '24h', '7d', '30m') to milliseconds
 */
function parseExpiryMs(expiry) {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 24h
  const num = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

// ============================================
// Token Functions
// ============================================

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  const tokenId = crypto.randomBytes(16).toString('hex');

  const payload = {
    sub: user.id,
    username: user.username,
    isAdmin: user.is_admin === 1,
    jti: tokenId
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  // Calculate expiry timestamp
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000).toISOString();

  // Store session
  sessions.create(user.id, tokenId, expiresAt);

  return { token, expiresAt };
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if session is still valid (not revoked)
    if (!sessions.isValid(decoded.jti)) {
      return null;
    }

    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie
 */
function extractToken(req) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}

// ============================================
// Middleware
// ============================================

/**
 * Authentication middleware
 * Attaches user to req.user if authenticated
 */
function authenticate(req, res, next) {
  // Check for API key first
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const user = users.getByApiKey(apiKey);
    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
        authMethod: 'api_key'
      };
      return next();
    }
  }

  // Check for JWT token
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      // Verify user still exists and get current role from database
      const dbUser = users.getById(decoded.sub);
      if (dbUser) {
        req.user = {
          id: dbUser.id,
          username: dbUser.username,
          isAdmin: dbUser.is_admin === 1,
          tokenId: decoded.jti,
          authMethod: 'jwt'
        };
        return next();
      }
    }
  }

  // No valid authentication
  req.user = null;
  next();
}

/**
 * Require authentication middleware
 */
function requireAuth(req, res, next) {
  authenticate(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  });
}

/**
 * Require admin middleware
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// ============================================
// Route Handlers
// ============================================

/**
 * Get client IP address from request.
 * Uses Express's req.ip which respects the 'trust proxy' setting.
 * Configure app.set('trust proxy', ...) to match your deployment topology.
 */
function getClientIP(req) {
  const ip = req.ip || 'unknown';
  // Extract IPv4 from IPv6-mapped addresses (::ffff:x.x.x.x)
  const mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/i);
  return mapped ? mapped[1] : ip;
}

/**
 * Login handler
 * POST /api/auth/login
 * Body: { username, password }
 */
async function login(req, res) {
  const { username, password } = req.body;
  const clientIP = getClientIP(req);

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = users.getByUsername(username);

  if (!user || !(await users.verifyPassword(user, password))) {
    logs.add('warn', `Failed login attempt for username: ${username} from IP: ${clientIP}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate token
  const { token, expiresAt } = generateToken(user);

  // Set httpOnly cookie
  res.cookie('token', token, {
    ...getCookieOptions(),
    maxAge: parseExpiryMs(JWT_EXPIRY)
  });

  // Update last login
  users.updateLastLogin(user.id);

  // Log successful login with IP
  logs.add('info', `User logged in: ${username} from IP: ${clientIP}`, user.id);

  const response = {
    expiresAt,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1
    }
  };

  // Flag if password change is required
  if (user.must_change_password) {
    response.mustChangePassword = true;
  }

  res.json(response);
}

/**
 * Logout handler
 * POST /api/auth/logout
 */
function logout(req, res) {
  if (req.user && req.user.tokenId) {
    const clientIP = getClientIP(req);
    sessions.revoke(req.user.tokenId);
    logs.add('info', `User logged out: ${req.user.username} from IP: ${clientIP}`, req.user.id);
  }

  res.clearCookie('token', getCookieOptions());
  res.json({ success: true });
}

/**
 * Get current user
 * GET /api/auth/me
 */
function getCurrentUser(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = users.getById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    isAdmin: user.is_admin === 1,
    createdAt: user.created_at,
    lastLogin: user.last_login
  });
}

/**
 * Refresh token
 * POST /api/auth/refresh
 */
function refreshToken(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Revoke old token
  if (req.user.tokenId) {
    sessions.revoke(req.user.tokenId);
  }

  // Get fresh user data
  const user = users.getById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Generate new token
  const { token, expiresAt } = generateToken(user);

  // Set httpOnly cookie
  res.cookie('token', token, {
    ...getCookieOptions(),
    maxAge: parseExpiryMs(JWT_EXPIRY)
  });

  res.json({ expiresAt });
}

// ============================================
// Exports
// ============================================

module.exports = {
  // Middleware
  authenticate,
  requireAuth,
  requireAdmin,

  // Route handlers
  login,
  logout,
  getCurrentUser,
  refreshToken,

  // Utilities
  generateToken,
  verifyToken,
  extractToken,
  getClientIP,

  // Config
  JWT_EXPIRY
};
