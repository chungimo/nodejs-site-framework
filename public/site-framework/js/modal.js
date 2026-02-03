/**
 * Site Framework - Modal System
 * ============================================
 *
 * USAGE:
 *   import { Modal, ConfirmModal } from './site-framework/js/modal.js';
 *
 *   const modal = new Modal({
 *     title: 'My Modal',
 *     content: '<p>Content here</p>',
 *     onClose: () => console.log('closed')
 *   });
 *   modal.open();
 *
 * FEATURES:
 * - Red X close button
 * - Click outside to close (with dirty form check)
 * - Z-index stacking for multiple modals
 * - Keyboard: Tab cycling, Enter submit, Esc close
 * - Dirty form detection with confirmation
 */

// Track open modals for z-index stacking
let openModals = [];
let modalIdCounter = 0;

export class Modal {
  constructor(options = {}) {
    this.id = `sf-modal-${++modalIdCounter}`;
    this.title = options.title || '';
    this.content = options.content || '';
    this.footer = options.footer || null;
    this.fullscreen = options.fullscreen || false;
    this.closable = options.closable !== false;
    this.onClose = options.onClose || (() => {});
    this.onSubmit = options.onSubmit || null;
    this.checkDirty = options.checkDirty || (() => false);

    this.element = null;
    this.overlayElement = null;
    this.isOpen = false;
    this._boundKeyHandler = this._handleKeydown.bind(this);
  }

  /**
   * Create and open the modal
   */
  open() {
    this._create();
    this._bindEvents();  // Bind events after _create() so subclass content is ready
    document.body.appendChild(this.overlayElement);

    // Track for z-index stacking
    openModals.push(this);
    if (openModals.length > 1) {
      this.overlayElement.classList.add('sf-stacked');
    }

    // Trigger open animation
    requestAnimationFrame(() => {
      this.overlayElement.classList.add('sf-open');
      this.isOpen = true;
    });

    // Bind keyboard events
    document.addEventListener('keydown', this._boundKeyHandler);

    // Focus first input
    setTimeout(() => {
      const firstInput = this.element.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 100);

    return this;
  }

  /**
   * Close the modal
   * @param {boolean} force - Skip dirty check
   */
  close(force = false) {
    if (!this.isOpen) return;

    // Check for unsaved changes
    if (!force && this.checkDirty()) {
      this._showDirtyConfirm();
      return;
    }

    this.overlayElement.classList.remove('sf-open');

    // Remove after animation
    setTimeout(() => {
      document.removeEventListener('keydown', this._boundKeyHandler);
      this.overlayElement.remove();

      // Remove from tracking
      const idx = openModals.indexOf(this);
      if (idx > -1) openModals.splice(idx, 1);

      this.isOpen = false;
      this.onClose();
    }, 250);
  }

  /**
   * Update modal content
   */
  setContent(content) {
    const contentEl = this.element.querySelector('.sf-modal-content');
    if (contentEl) {
      if (typeof content === 'string') {
        contentEl.innerHTML = content;
      } else {
        contentEl.innerHTML = '';
        contentEl.appendChild(content);
      }
    }
  }

  /**
   * Show error in modal
   */
  showError(message) {
    let errorEl = this.element.querySelector('.sf-modal-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'sf-modal-error';
      errorEl.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 16px;
        background: rgba(255, 107, 107, 0.2);
        border: 1px solid rgba(255, 107, 107, 0.4);
        border-radius: 8px;
        color: #ff6b6b;
        font-size: 14px;
      `;
      const content = this.element.querySelector('.sf-modal-content');
      content.insertBefore(errorEl, content.firstChild);
    }
    errorEl.textContent = message;
  }

  /**
   * Clear error
   */
  clearError() {
    const errorEl = this.element.querySelector('.sf-modal-error');
    if (errorEl) errorEl.remove();
  }

  _create() {
    // Create overlay
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'sf-modal-overlay';
    // Add password manager ignore attributes
    this.overlayElement.setAttribute('data-1p-ignore', 'true');
    this.overlayElement.setAttribute('data-lpignore', 'true');
    this.overlayElement.setAttribute('data-bwignore', 'true');
    this.overlayElement.addEventListener('click', (e) => {
      if (e.target === this.overlayElement && this.closable) {
        this.close();
      }
    });

    // Create modal
    this.element = document.createElement('div');
    this.element.className = `sf-modal sf-glass-panel ${this.fullscreen ? 'sf-modal-fullscreen' : ''}`;
    this.element.id = this.id;
    // Add password manager ignore attributes
    this.element.setAttribute('data-1p-ignore', 'true');
    this.element.setAttribute('data-lpignore', 'true');
    this.element.setAttribute('data-bwignore', 'true');

    this.element.innerHTML = `
      <div class="sf-modal-header">
        <h2 class="sf-modal-title">${this.title}</h2>
        ${this.closable ? '<button type="button" class="sf-modal-close" aria-label="Close" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other" autocomplete="off">&times;</button>' : ''}
      </div>
      <div class="sf-modal-content" data-1p-ignore="true" data-lpignore="true">
        ${typeof this.content === 'string' ? this.content : ''}
      </div>
      ${this.footer !== null ? `<div class="sf-modal-footer" data-1p-ignore="true" data-lpignore="true">${this.footer}</div>` : ''}
    `;

    // Append content if element
    if (typeof this.content !== 'string' && this.content) {
      this.element.querySelector('.sf-modal-content').appendChild(this.content);
    }

    // Bind close button
    const closeBtn = this.element.querySelector('.sf-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    this.overlayElement.appendChild(this.element);
  }

  _bindEvents() {
    // Subclasses can override to add event bindings
    // Called after _create() completes in open()
  }

  _handleKeydown(e) {
    // Only handle if this is the top modal
    if (openModals[openModals.length - 1] !== this) return;

    if (e.key === 'Escape' && this.closable) {
      e.preventDefault();
      this.close();
    } else if (e.key === 'Enter' && this.onSubmit) {
      // Only submit if not in a textarea
      if (e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.onSubmit();
      }
    } else if (e.key === 'Tab') {
      this._handleTabNavigation(e);
    }
  }

  _handleTabNavigation(e) {
    const focusable = this.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  _showDirtyConfirm() {
    const confirm = new ConfirmModal({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to close?',
      confirmText: 'Discard',
      confirmStyle: 'danger',
      onConfirm: () => {
        confirm.close();
        this.close(true);
      }
    });
    confirm.open();
  }
}

/**
 * Confirmation Modal
 * Stacked modal for confirmations
 */
export class ConfirmModal extends Modal {
  constructor(options = {}) {
    const iconClass = options.confirmStyle === 'danger' ? 'sf-icon-delete' : 'sf-icon-warning';
    const colorClass = options.confirmStyle === 'danger' ? 'sf-danger' : 'sf-warning';

    super({
      title: options.title || 'Confirm',
      content: `
        <div class="sf-confirm-icon ${colorClass}"><i class="sf-icon sf-icon-lg ${iconClass}"></i></div>
        <p class="sf-confirm-message">${options.message || 'Are you sure?'}</p>
      `,
      footer: `
        <button type="button" class="sf-btn sf-btn-${options.confirmStyle || 'primary'}" id="confirm-yes" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other" autocomplete="off">
          ${options.confirmText || 'Confirm'}
        </button>
        <button type="button" class="sf-btn sf-btn-secondary" id="confirm-no" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other" autocomplete="off">
          ${options.cancelText || 'Cancel'}
        </button>
      `,
      closable: options.closable !== false,
      onClose: options.onCancel || (() => {})
    });

    this.onConfirm = options.onConfirm || (() => {});
  }

  _bindEvents() {
    const yesBtn = this.element.querySelector('#confirm-yes');
    const noBtn = this.element.querySelector('#confirm-no');

    yesBtn.addEventListener('click', () => {
      this.onConfirm();
    });

    noBtn.addEventListener('click', () => {
      this.close();
    });
  }
}

/**
 * Get count of open modals
 */
export function getOpenModalCount() {
  return openModals.length;
}

export default Modal;
