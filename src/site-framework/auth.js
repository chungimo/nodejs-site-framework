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
 * - bcrypt password hashing (handled in database.js)
 * - Session tracking for token revocation
 * - API key authentication support
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { users, sessions, logs } = require('./database');

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
      req.user = {
        id: decoded.sub,
        username: decoded.username,
        isAdmin: decoded.isAdmin,
        tokenId: decoded.jti,
        authMethod: 'jwt'
      };
      return next();
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
 * Extract IPv4 from an IP string
 * Handles IPv6-mapped IPv4 addresses like ::ffff:192.168.1.1
 */
function extractIPv4(ip) {
  if (!ip) return null;
  // Check for IPv6-mapped IPv4 (::ffff:x.x.x.x)
  const ipv4Mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/i);
  if (ipv4Mapped) return ipv4Mapped[1];
  // Check if already IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
  return null;
}

/**
 * Get client IP address from request
 * Prefers IPv4 addresses when available
 */
function getClientIP(req) {
  const candidates = [];

  // Check X-Forwarded-For header (for proxied requests)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Collect all IPs from the header
    forwarded.split(',').forEach(ip => candidates.push(ip.trim()));
  }

  // Check X-Real-IP header
  if (req.headers['x-real-ip']) {
    candidates.push(req.headers['x-real-ip']);
  }

  // Add Express's ip and socket remote address
  if (req.ip) candidates.push(req.ip);
  if (req.connection?.remoteAddress) candidates.push(req.connection.remoteAddress);

  // First, try to find an IPv4 address
  for (const ip of candidates) {
    const ipv4 = extractIPv4(ip);
    if (ipv4) return ipv4;
  }

  // Fallback to first candidate or unknown
  return candidates[0] || 'unknown';
}

/**
 * Login handler
 * POST /api/auth/login
 * Body: { username, password }
 */
function login(req, res) {
  const { username, password } = req.body;
  const clientIP = getClientIP(req);

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = users.getByUsername(username);

  if (!user || !users.verifyPassword(user, password)) {
    logs.add('warn', `Failed login attempt for username: ${username} from IP: ${clientIP}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate token
  const { token, expiresAt } = generateToken(user);

  // Update last login
  users.updateLastLogin(user.id);

  // Log successful login with IP
  logs.add('info', `User logged in: ${username} from IP: ${clientIP}`, user.id);

  res.json({
    token,
    expiresAt,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1
    }
  });
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

  res.json({ token, expiresAt });
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

  // Config (for testing)
  JWT_SECRET,
  JWT_EXPIRY
};
