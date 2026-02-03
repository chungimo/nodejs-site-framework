/**
 * Site Framework - Notification Channel Configurations
 * ============================================
 *
 * USAGE:
 *   import { CHANNEL_TYPES, getChannelConfig } from './notifications/channels.js';
 *
 *   const teamsConfig = getChannelConfig('teams');
 *   console.log(teamsConfig.fields);
 *
 * CUSTOMIZATION:
 * - Add new channel types to CHANNEL_TYPES
 * - Each channel defines its icon, fields, and validation
 */

/**
 * Channel type definitions
 * Each channel type specifies:
 * - id: Unique identifier
 * - name: Display name
 * - icon: Emoji or symbol for the channel
 * - description: Brief description
 * - fields: Array of field configurations for the form
 * - sensitive: Array of field IDs that should be encrypted
 */
export const CHANNEL_TYPES = {
  teams: {
    id: 'teams',
    name: 'Microsoft Teams',
    icon: '/icons/icon-msteams.png',
    description: 'Send notifications via Teams Incoming Webhook',
    fields: [
      {
        id: 'webhookUrl',
        label: 'Webhook URL',
        type: 'text',
        required: true,
        help: 'Create an Incoming Webhook connector in your Teams channel',
        hint: 'Format: https://outlook.office.com/webhook/...',
        validate: (value) => {
          if (!value.startsWith('https://')) {
            return 'Webhook URL must start with https://';
          }
          return true;
        }
      }
    ],
    sensitive: []
  },

  email: {
    id: 'email',
    name: 'Email (SMTP)',
    icon: '/icons/icon-email.png',
    description: 'Send notifications via SMTP email relay',
    fields: [
      {
        id: 'smtpServer',
        label: 'SMTP Server',
        type: 'text',
        required: true,
        help: 'SMTP server hostname',
        hint: 'e.g., smtp.office365.com, smtp.gmail.com'
      },
      {
        id: 'smtpPort',
        label: 'Port',
        type: 'number',
        required: true,
        value: '587',
        size: 'sm',
        help: '587 for STARTTLS, 465 for TLS, 25 for unencrypted'
      },
      {
        id: 'useTls',
        label: 'Use TLS',
        type: 'checkbox',
        value: true,
        help: 'Enable TLS encryption (recommended)'
      },
      {
        id: 'smtpUsername',
        label: 'Username',
        type: 'text',
        required: true,
        help: 'SMTP authentication username'
      },
      {
        id: 'smtpPassword',
        label: 'Password',
        type: 'password',
        required: true,
        help: 'SMTP authentication password'
      },
      {
        id: 'fromAddress',
        label: 'From Address',
        type: 'email',
        required: true,
        help: 'Sender email address'
      },
      {
        id: 'toAddresses',
        label: 'To Address(es)',
        type: 'text',
        required: true,
        help: 'Recipient email addresses (comma-separated)',
        hint: 'e.g., admin@example.com, alerts@example.com'
      }
    ],
    sensitive: ['smtpPassword'],
    fieldRows: [
      ['smtpServer', 'smtpPort'],
      ['smtpUsername', 'smtpPassword'],
      ['fromAddress'],
      ['toAddresses']
    ]
  },

  slack: {
    id: 'slack',
    name: 'Slack',
    icon: '/icons/icon-slack.png',
    description: 'Send notifications via Slack Incoming Webhook',
    fields: [
      {
        id: 'webhookUrl',
        label: 'Webhook URL',
        type: 'text',
        required: true,
        help: 'Create an Incoming Webhook in your Slack workspace',
        hint: 'Format: https://hooks.slack.com/services/...'
      },
      {
        id: 'channel',
        label: 'Channel Override',
        type: 'text',
        required: false,
        help: 'Override the default channel (optional)',
        hint: 'e.g., #alerts or @username'
      },
      {
        id: 'username',
        label: 'Bot Username',
        type: 'text',
        required: false,
        help: 'Override the bot name (optional)'
      }
    ],
    sensitive: []
  },

  discord: {
    id: 'discord',
    name: 'Discord',
    icon: '/icons/icon-discord.png',
    description: 'Send notifications via Discord Webhook',
    fields: [
      {
        id: 'webhookUrl',
        label: 'Webhook URL',
        type: 'text',
        required: true,
        help: 'Create a Webhook in your Discord server settings',
        hint: 'Format: https://discord.com/api/webhooks/...'
      },
      {
        id: 'username',
        label: 'Bot Username',
        type: 'text',
        required: false,
        help: 'Override the webhook bot name (optional)'
      },
      {
        id: 'avatarUrl',
        label: 'Avatar URL',
        type: 'text',
        required: false,
        help: 'Custom avatar image URL (optional)'
      }
    ],
    sensitive: []
  },

  webhook: {
    id: 'webhook',
    name: 'Generic Webhook',
    icon: '🔗',
    description: 'Send notifications to a custom webhook endpoint',
    fields: [
      {
        id: 'webhookUrl',
        label: 'Webhook URL',
        type: 'text',
        required: true,
        help: 'The endpoint URL to send notifications to'
      },
      {
        id: 'authType',
        label: 'Authentication',
        type: 'select',
        required: false,
        options: [
          { value: 'none', label: 'None' },
          { value: 'bearer', label: 'Bearer Token' },
          { value: 'apikey', label: 'API Key Header' },
          { value: 'basic', label: 'Basic Auth' }
        ],
        help: 'Authentication method for the webhook'
      },
      {
        id: 'authValue',
        label: 'Auth Token/Key',
        type: 'password',
        required: false,
        help: 'Token, API key, or username:password for Basic Auth',
        showWhen: (values) => values.authType && values.authType !== 'none'
      },
      {
        id: 'customHeaders',
        label: 'Custom Headers',
        type: 'text',
        required: false,
        help: 'Additional headers as JSON object',
        hint: 'e.g., {"X-Custom-Header": "value"}'
      }
    ],
    sensitive: ['authValue']
  }
};

/**
 * Get configuration for a channel type
 * @param {string} channelType - The channel type ID
 * @returns {Object|null} - Channel configuration or null if not found
 */
export function getChannelConfig(channelType) {
  return CHANNEL_TYPES[channelType] || null;
}

/**
 * Get all available channel types
 * @returns {Array} - Array of channel configurations
 */
export function getAllChannelTypes() {
  return Object.values(CHANNEL_TYPES);
}

/**
 * Check if a field value should be masked (sensitive data)
 * @param {string} channelType - The channel type ID
 * @param {string} fieldId - The field ID
 * @returns {boolean} - True if field is sensitive
 */
export function isSensitiveField(channelType, fieldId) {
  const config = getChannelConfig(channelType);
  if (!config) return false;
  return config.sensitive?.includes(fieldId) || false;
}

export default {
  CHANNEL_TYPES,
  getChannelConfig,
  getAllChannelTypes,
  isSensitiveField
};
