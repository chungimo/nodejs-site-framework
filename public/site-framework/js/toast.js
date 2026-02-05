/**
 * Site Framework - Toast Notifications
 * ============================================
 *
 * USAGE:
 *   import { toast } from './site-framework/js/toast.js';
 *
 *   toast.info('Information message');
 *   toast.success('Operation completed!');
 *   toast.warning('Warning message');
 *   toast.error('Error occurred');
 *
 *   // With options
 *   toast.show({
 *     type: 'success',
 *     title: 'Success!',
 *     message: 'User created successfully',
 *     duration: 5000
 *   });
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
  }

  _ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'sf-toast-container';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  /**
   * Show a toast notification
   * @param {Object} options
   * @param {string} options.type - info, success, warning, danger
   * @param {string} options.title - Toast title
   * @param {string} options.message - Toast message
   * @param {number} options.duration - Duration in ms (default: 4000)
   */
  show(options) {
    const container = this._ensureContainer();

    const type = options.type || 'info';
    const duration = options.duration || 4000;

    const iconClasses = {
      info: 'sf-icon-info',
      success: 'sf-icon-success',
      warning: 'sf-icon-warning',
      danger: 'sf-icon-delete'
    };

    const toast = document.createElement('div');
    toast.className = `sf-toast sf-toast-${type}`;
    const escapedTitle = options.title ? this._escapeHtml(options.title) : '';
    const escapedMessage = this._escapeHtml(options.message);
    toast.innerHTML = `
      <span class="sf-toast-icon"><i class="sf-icon sf-icon-lg ${iconClasses[type]}"></i></span>
      <div class="sf-toast-content">
        ${escapedTitle ? `<div class="sf-toast-title">${escapedTitle}</div>` : ''}
        <div class="sf-toast-message">${escapedMessage}</div>
      </div>
      <div class="sf-toast-progress" style="animation-duration: ${duration}ms"></div>
    `;

    container.appendChild(toast);
    this.toasts.push(toast);

    // Auto remove after duration
    setTimeout(() => {
      this._remove(toast);
    }, duration);

    return toast;
  }

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  _remove(toast) {
    toast.classList.add('sf-toast-out');
    setTimeout(() => {
      toast.remove();
      const idx = this.toasts.indexOf(toast);
      if (idx > -1) this.toasts.splice(idx, 1);
    }, 300);
  }

  info(message, title = '') {
    return this.show({ type: 'info', title, message });
  }

  success(message, title = '') {
    return this.show({ type: 'success', title, message });
  }

  warning(message, title = '') {
    return this.show({ type: 'warning', title, message });
  }

  error(message, title = '') {
    return this.show({ type: 'danger', title, message });
  }

  /**
   * Show a logout toast with countdown
   */
  logout(callback, delay = 3000) {
    const toast = this.show({
      type: 'info',
      title: 'Logging Out',
      message: 'You are being logged out...',
      duration: delay
    });

    setTimeout(() => {
      if (callback) callback();
    }, delay);

    return toast;
  }
}

export const toast = new ToastManager();
export default toast;
