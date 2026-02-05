/**
 * Notification Channels Module
 * ============================================
 *
 * USAGE:
 *   import { CHANNEL_TYPES, NotificationAPI } from './notifications/index.js';
 *
 * EXPORTS:
 *   CHANNEL_TYPES              - Channel type definitions (Teams, Email, Slack, Discord, Webhook)
 *   getChannelConfig(id)       - Get config for a specific channel type
 *   getAllChannelTypes()        - Get all channel type definitions
 *   isSensitiveField(type, f)  - Check if a field is sensitive
 *   NotificationChannelForm    - Form component for channel configuration
 *   NotificationAPI            - API client: getAll, get, save, test, delete
 */

import { auth } from '../auth.js';

// Re-export channel configurations
export {
  CHANNEL_TYPES,
  getChannelConfig,
  getAllChannelTypes,
  isSensitiveField
} from './channels.js';

// Re-export form component
export { NotificationChannelForm } from './forms.js';

// API client for notification endpoints (uses auth.fetch for consistency)
export const NotificationAPI = {
  async getAll() {
    const response = await auth.fetch('/api/notifications/channels');
    if (!response.ok) throw new Error('Failed to fetch notification channels');
    return response.json();
  },

  async get(channelType) {
    const response = await auth.fetch(`/api/notifications/channels/${channelType}`);
    if (!response.ok) throw new Error('Failed to fetch channel configuration');
    return response.json();
  },

  async save(channelType, config) {
    const response = await auth.fetch(`/api/notifications/channels/${channelType}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save channel configuration');
    }
    return response.json();
  },

  async test(channelType, config) {
    const response = await auth.fetch(`/api/notifications/channels/${channelType}/test`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Test failed');
    }
    return response.json();
  },

  async delete(channelType) {
    const response = await auth.fetch(`/api/notifications/channels/${channelType}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete channel configuration');
    return response.json();
  }
};
