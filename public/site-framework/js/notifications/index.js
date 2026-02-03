/**
 * Site Framework - Notification Channels Module
 * ============================================
 *
 * USAGE:
 *   import {
 *     CHANNEL_TYPES,
 *     getChannelConfig,
 *     getAllChannelTypes,
 *     NotificationChannelForm
 *   } from './site-framework/js/notifications/index.js';
 *
 * This module provides:
 * - Channel type configurations (Teams, Email, Slack, Discord, Webhook)
 * - Form component for configuring notification channels
 * - Validation and sensitive field handling
 */

// Re-export channel configurations
export {
  CHANNEL_TYPES,
  getChannelConfig,
  getAllChannelTypes,
  isSensitiveField
} from './channels.js';

// Re-export form component
export { NotificationChannelForm } from './forms.js';

// API helper for notification endpoints
export const NotificationAPI = {
  /**
   * Get all configured notification channels
   */
  async getAll() {
    const response = await fetch('/api/notifications/channels', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sf_auth_token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch notification channels');
    return response.json();
  },

  /**
   * Get a specific channel configuration
   */
  async get(channelType) {
    const response = await fetch(`/api/notifications/channels/${channelType}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sf_auth_token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch channel configuration');
    return response.json();
  },

  /**
   * Save channel configuration
   */
  async save(channelType, config) {
    const response = await fetch(`/api/notifications/channels/${channelType}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sf_auth_token')}`
      },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save channel configuration');
    }
    return response.json();
  },

  /**
   * Test a notification channel
   */
  async test(channelType, config) {
    const response = await fetch(`/api/notifications/channels/${channelType}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sf_auth_token')}`
      },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Test failed');
    }
    return response.json();
  },

  /**
   * Delete a channel configuration
   */
  async delete(channelType) {
    const response = await fetch(`/api/notifications/channels/${channelType}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sf_auth_token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to delete channel configuration');
    return response.json();
  }
};

export default {
  NotificationAPI
};
