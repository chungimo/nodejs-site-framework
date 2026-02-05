/**
 * Notifications Settings Section
 * ============================================
 *
 * Factory function that creates the notification channels UI
 * for embedding in the SettingsModal sidebar.
 *
 * USAGE:
 *   import { createNotificationsSection } from './notificationsSection.js';
 *   settingsModal.addSection('Notifications', createNotificationsSection());
 */

import { getAllChannelTypes, NotificationChannelForm, NotificationAPI } from './notifications/index.js';
import { toast } from './toast.js';

export function createNotificationsSection() {
  const container = document.createElement('div');
  container.className = 'sf-notify-channels';

  const channelTypes = getAllChannelTypes();

  channelTypes.forEach(async (channelConfig) => {
    const channelContainer = document.createElement('div');
    container.appendChild(channelContainer);

    let initialValues = {};
    try {
      const saved = await NotificationAPI.get(channelConfig.id);
      if (saved) {
        initialValues = { enabled: saved.enabled, ...saved.config };
      }
    } catch (err) {
      // Channel not configured yet, use defaults
    }

    new NotificationChannelForm({
      channelType: channelConfig.id,
      container: channelContainer,
      initialValues,
      onSave: async (values) => {
        try {
          await NotificationAPI.save(channelConfig.id, values);
          toast.success(`${channelConfig.name} configuration saved`);
        } catch (err) {
          toast.error(`Failed to save: ${err.message}`);
        }
      },
      onTest: async (values) => {
        try {
          await NotificationAPI.test(channelConfig.id, values);
          toast.success('Test notification sent!');
        } catch (err) {
          toast.error(`Test failed: ${err.message}`);
        }
      },
      onToggle: (enabled) => {
        // Toggle is saved when form is saved
      }
    });
  });

  return container;
}
