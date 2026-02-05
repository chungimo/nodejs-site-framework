/**
 * Site Framework - Forced Password Change Modal
 * ============================================
 *
 * Non-closable modal shown when a user must change their password
 * (e.g., first login with default credentials).
 *
 * USAGE:
 *   import { ChangePasswordModal } from './site-framework/js/changePasswordModal.js';
 *
 *   const modal = new ChangePasswordModal({
 *     onComplete: () => { ... }
 *   });
 *   modal.open();
 */

import { Modal } from './modal.js';
import { auth } from './auth.js';
import { toast } from './toast.js';
import { createField, validateField } from './field.js';

export class ChangePasswordModal extends Modal {
  constructor(options = {}) {
    super({
      title: 'Password Change Required',
      closable: false,
      footer: `
        <button class="sf-btn sf-btn-primary" id="change-pw-save">Change Password</button>
      `,
      ...options
    });

    this.onComplete = options.onComplete || (() => {});
  }

  _create() {
    super._create();

    const contentEl = this.element.querySelector('.sf-modal-content');
    contentEl.innerHTML = `
      <div class="sf-change-password-modal">
        <p style="margin: 0 0 16px; color: var(--sf-text-secondary, #999);">
          You must change your password before continuing.
        </p>
        <div id="change-pw-fields"></div>
      </div>
    `;

    this._createFields();
  }

  _createFields() {
    const container = this.element.querySelector('#change-pw-fields');

    this.currentPasswordField = createField({
      id: 'change-pw-current',
      label: 'Current Password',
      type: 'password',
      required: true
    });
    container.appendChild(this.currentPasswordField);

    this.newPasswordField = createField({
      id: 'change-pw-new',
      label: 'New Password',
      type: 'password',
      required: true,
      validate: (val) => {
        if (val.length < 8) return 'Password must be at least 8 characters';
        return true;
      }
    });
    container.appendChild(this.newPasswordField);

    this.confirmPasswordField = createField({
      id: 'change-pw-confirm',
      label: 'Confirm New Password',
      type: 'password',
      required: true,
      validate: (val) => {
        const newPass = this.newPasswordField.querySelector('input').value;
        if (val !== newPass) return 'Passwords do not match';
        return true;
      }
    });
    container.appendChild(this.confirmPasswordField);
  }

  _bindEvents() {
    const saveBtn = this.element.querySelector('#change-pw-save');
    saveBtn.addEventListener('click', () => this._save());

    // Enter key to submit
    this.element.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._save();
      });
    });
  }

  async _save() {
    const currentValid = validateField(this.currentPasswordField);
    const newValid = validateField(this.newPasswordField);
    const confirmValid = validateField(this.confirmPasswordField);

    if (!currentValid || !newValid || !confirmValid) return;

    const currentPassword = this.currentPasswordField.querySelector('input').value;
    const newPassword = this.newPasswordField.querySelector('input').value;

    const saveBtn = this.element.querySelector('#change-pw-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Changing...';

    try {
      const res = await auth.fetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success('Password changed successfully');
      this.close();
      this.onComplete();
    } catch (err) {
      console.error('Failed to change password:', err);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Change Password';
      toast.error(err.message);
    }
  }
}

export default ChangePasswordModal;
