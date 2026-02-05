/**
 * Site Framework - Frontend Entry Point
 * ============================================
 *
 * USAGE:
 *   import * as SF from './site-framework/js/index.js';
 *
 *   // Or import specific modules
 *   import { Modal, SettingsModal, auth, toast } from './site-framework/js/index.js';
 *
 * EXPORTS:
 *   Modal, ConfirmModal, getOpenModalCount  - Base modal system with stacking & keyboard support
 *   SettingsModal                           - Fullscreen modal with sidebar section navigation
 *   LogsModal                              - Terminal-style log viewer
 *   LoginModal                             - Username/password login dialog
 *   AccountModal                           - Self-service account settings (password, API key)
 *   UserModal                              - Admin user edit/create dialog
 *
 *   createUsersSection, refreshUsers        - Users management table for SettingsModal
 *   createNotificationsSection              - Notification channels UI for SettingsModal
 *
 *   auth                                   - Auth manager: login, logout, isLoggedIn, fetch
 *   toast                                  - Toast notifications: info, success, warning, error
 *
 *   createField, validateField, ...         - Form field creation & validation utilities
 *   Table                                  - Sortable data table component
 *
 *   CHANNEL_TYPES, NotificationAPI, ...     - Notification channel configs & API client
 */

// Modal system
export { Modal, ConfirmModal, getOpenModalCount } from './modal.js';
export { SettingsModal } from './settings.js';
export { LogsModal } from './logs.js';
export { LoginModal } from './loginModal.js';
export { AccountModal } from './accountModal.js';
export { UserModal } from './userModal.js';
export { ChangePasswordModal } from './changePasswordModal.js';

// Settings section helpers
export { createUsersSection, refreshUsers } from './usersSection.js';
export { createNotificationsSection } from './notificationsSection.js';

// Auth
export { auth } from './auth.js';

// Toast notifications
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
