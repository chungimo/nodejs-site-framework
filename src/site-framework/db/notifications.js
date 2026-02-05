/**
 * Notification Channels DAO
 * ============================================
 *
 * CRUD for notification channel configurations.
 * Handles encryption/masking of sensitive fields (passwords, auth tokens).
 *
 * USAGE:
 *   const { notificationChannels } = require('./db');
 *   notificationChannels.save('teams', true, { webhookUrl: '...' });
 *   const channel = notificationChannels.getDecrypted('teams');
 */

const { getDatabase } = require('./connection');
const { encryption } = require('./encryption');

// Sensitive fields that should be encrypted (by channel type)
const SENSITIVE_FIELDS = {
  teams: [],
  email: ['smtpPassword'],
  slack: [],
  discord: [],
  webhook: ['authValue']
};

/**
 * Parse config JSON and handle sensitive fields
 */
function parseConfig(channelType, configStr, decrypt) {
  if (!configStr) return {};

  try {
    const config = JSON.parse(configStr);
    const sensitiveFields = SENSITIVE_FIELDS[channelType] || [];

    if (decrypt) {
      for (const field of sensitiveFields) {
        if (config[field]) {
          config[field] = encryption.decrypt(config[field]);
        }
      }
    } else {
      for (const field of sensitiveFields) {
        if (config[field]) {
          config[field] = '••••••••';
        }
      }
    }

    return config;
  } catch {
    return {};
  }
}

/**
 * Build a channel response object from a database row
 */
function toChannelObject(row, decrypt) {
  return {
    channelType: row.channel_type,
    enabled: !!row.enabled,
    config: parseConfig(row.channel_type, row.config, decrypt),
    ...(row.created_at && { createdAt: row.created_at }),
    ...(row.updated_at && { updatedAt: row.updated_at })
  };
}

const notificationChannels = {
  getAll() {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT channel_type, enabled, config, created_at, updated_at
      FROM notification_channels
    `).all();

    return rows.map(row => toChannelObject(row, false));
  },

  get(channelType) {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT channel_type, enabled, config, created_at, updated_at
      FROM notification_channels WHERE channel_type = ?
    `).get(channelType);

    if (!row) return null;
    return toChannelObject(row, false);
  },

  getDecrypted(channelType) {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT channel_type, enabled, config
      FROM notification_channels WHERE channel_type = ?
    `).get(channelType);

    if (!row) return null;
    return toChannelObject(row, true);
  },

  save(channelType, enabled, config) {
    const db = getDatabase();

    const existing = this.getDecrypted(channelType);
    const existingConfig = existing ? existing.config : {};
    const sensitiveFields = SENSITIVE_FIELDS[channelType] || [];
    const mergedConfig = { ...existingConfig };

    for (const [key, value] of Object.entries(config)) {
      if (sensitiveFields.includes(key)) {
        if (value) {
          mergedConfig[key] = encryption.encrypt(value);
        }
      } else {
        mergedConfig[key] = value;
      }
    }

    const configStr = JSON.stringify(mergedConfig);

    db.prepare(`
      INSERT INTO notification_channels (channel_type, enabled, config, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(channel_type) DO UPDATE SET
        enabled = ?,
        config = ?,
        updated_at = CURRENT_TIMESTAMP
    `).run(channelType, enabled ? 1 : 0, configStr, enabled ? 1 : 0, configStr);
  },

  delete(channelType) {
    const db = getDatabase();
    db.prepare('DELETE FROM notification_channels WHERE channel_type = ?').run(channelType);
  }
};

module.exports = { notificationChannels };
