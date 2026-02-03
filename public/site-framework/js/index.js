/**
 * Site Framework - JavaScript Entry Point
 * ============================================
 *
 * USAGE:
 *   import * as SF from './site-framework/js/index.js';
 *
 *   // Or import specific modules
 *   import { Modal, SettingsModal } from './site-framework/js/index.js';
 *   import { auth } from './site-framework/js/index.js';
 *   import { toast } from './site-framework/js/index.js';
 */

// Modal system
export { Modal, ConfirmModal, getOpenModalCount } from './modal.js';
export { SettingsModal } from './settings.js';
export { LogsModal } from './logs.js';
export { LoginModal } from './loginModal.js';
export { AccountModal } from './accountModal.js';
export { UserModal } from './userModal.js';

// Settings section helpers
export { createUsersSection, refreshUsers } from './usersSection.js';
// createNotificationsSection is defined below after imports

// Auth
export { auth } from './auth.js';

// Notifications
export { toast } from './toast.js';

// Form utilities
export {
  createField,
  validateField,
  validateForm,
  getFormValues,
  isFormDirty,
  setFieldError,
  clearFieldError,
  getFieldValue,
  setFieldValue
} from './field.js';

// Table component
export { Table } from './table.js';

// Notification channels
export {
  CHANNEL_TYPES,
  getChannelConfig,
  getAllChannelTypes,
  isSensitiveField,
  NotificationChannelForm,
  NotificationAPI
} from './notifications/index.js';

// Notification settings section helper
import { getAllChannelTypes as _getAllChannelTypes, NotificationChannelForm as _NotificationChannelForm, NotificationAPI as _NotificationAPI } from './notifications/index.js';
import { toast as _toast } from './toast.js';

export function createNotificationsSection() {
  const container = document.createElement('div');
  container.className = 'sf-notify-channels';

  const channelTypes = _getAllChannelTypes();

  channelTypes.forEach(async (channelConfig) => {
    const channelContainer = document.createElement('div');
    container.appendChild(channelContainer);

    // Fetch existing config
    let initialValues = {};
    try {
      const saved = await _NotificationAPI.get(channelConfig.id);
      if (saved) {
        initialValues = { enabled: saved.enabled, ...saved.config };
      }
    } catch (err) {
      // Channel not configured yet, use defaults
    }

    // Create the form
    new _NotificationChannelForm({
      channelType: channelConfig.id,
      container: channelContainer,
      initialValues,
      onSave: async (values) => {
        try {
          await _NotificationAPI.save(channelConfig.id, values);
          _toast.success(`${channelConfig.name} configuration saved`);
        } catch (err) {
          _toast.error(`Failed to save: ${err.message}`);
        }
      },
      onTest: async (values) => {
        try {
          await _NotificationAPI.test(channelConfig.id, values);
          _toast.success('Test notification sent!');
        } catch (err) {
          _toast.error(`Test failed: ${err.message}`);
        }
      },
      onToggle: (enabled) => {
        // Toggle is saved when form is saved
      }
    });
  });

  return container;
}
