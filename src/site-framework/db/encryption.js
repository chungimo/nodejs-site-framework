/**
 * Encryption Utilities
 * ============================================
 *
 * AES-256-CBC encryption for sensitive fields (e.g. SMTP passwords, webhook secrets).
 *
 * USAGE:
 *   const { encryption } = require('./db');
 *   const encrypted = encryption.encrypt('secret');
 *   const decrypted = encryption.decrypt(encrypted);
 *
 * Key resolution order:
 *   1. ENCRYPTION_KEY env var (derived via PBKDF2)
 *   2. Auto-generated key persisted to db/.encryption-key
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const KEY_FILE = path.join(__dirname, '../../../db/.encryption-key');
const DEFAULT_KEY = 'change-this-key-in-production-32b';

/**
 * Resolve the encryption key.
 * - If ENCRYPTION_KEY env var is set (and not the default), derive via PBKDF2.
 * - Otherwise, auto-generate a random key and persist it to db/.encryption-key.
 */
function resolveEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey && envKey !== DEFAULT_KEY) {
    // User-provided key: derive a proper 32-byte key via PBKDF2
    return crypto.pbkdf2Sync(envKey, 'site-framework-salt', 100000, 32, 'sha256');
  }

  if (envKey === DEFAULT_KEY) {
    console.log('[ENCRYPTION] WARNING: Using default encryption key. Set ENCRYPTION_KEY env var for production.');
  }

  // Auto-generate or load persisted key
  try {
    if (fs.existsSync(KEY_FILE)) {
      const stored = fs.readFileSync(KEY_FILE, 'utf8').trim();
      return Buffer.from(stored, 'hex');
    }
  } catch (err) {
    console.error('[ENCRYPTION] Error reading key file:', err.message);
  }

  // Generate new random key
  const newKey = crypto.randomBytes(32);
  try {
    const dir = path.dirname(KEY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(KEY_FILE, newKey.toString('hex'), 'utf8');
    console.log('[ENCRYPTION] Generated and saved new encryption key');
  } catch (err) {
    console.error('[ENCRYPTION] WARNING: Could not persist encryption key:', err.message);
  }

  return newKey;
}

// Resolve key once at module load
const ENCRYPTION_KEY_BUF = resolveEncryptionKey();

/**
 * Get the old-style key derivation (for migration purposes).
 * Uses the padEnd/substring approach from the original code.
 */
function getLegacyKey() {
  const raw = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  return Buffer.from(raw.padEnd(32, '0').substring(0, 32));
}

const encryption = {
  encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUF, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  decrypt(encryptedText) {
    if (!encryptedText) return '';
    try {
      const [iv, encrypted] = encryptedText.split(':');
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY_BUF, Buffer.from(iv, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      // Try legacy key for migration
      try {
        const [iv, encrypted] = encryptedText.split(':');
        const decipher = crypto.createDecipheriv(ALGORITHM, getLegacyKey(), Buffer.from(iv, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        console.error('Decryption error:', err.message);
        return '';
      }
    }
  }
};

module.exports = { encryption };
