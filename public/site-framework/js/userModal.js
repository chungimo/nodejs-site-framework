/**
 * Site Framework - User Modal
 * ============================================
 *
 * Admin modal for adding/editing users.
 *
 * USAGE:
 *   import { UserModal } from './site-framework/js/userModal.js';
 *
 *   // Add new user
 *   const modal = new UserModal({
 *     onSave: (user) => { ... }
 *   });
 *   modal.open();
 *
 *   // Edit existing user
 *   const modal = new UserModal({
 *     user: { id: 1, username: 'john', is_admin: false },
 *     onSave: (user) => { ... }
 *   });
 *   modal.open();
 */

import { Modal } from './modal.js';
import { auth } from './auth.js';
import { toast } from './toast.js';
import { createField, validateField, setFieldError, getFieldValue } from './field.js';

export class UserModal extends Modal {
  constructor(options = {}) {
    const isEdit = !!options.user;

    super({
      title: isEdit ? 'Edit User' : 'Add User',
      closable: true,
      footer: `
        <button class="sf-btn sf-btn-primary" id="user-save">
          ${isEdit ? 'Save Changes' : 'Create User'}
        </button>
        <button class="sf-btn sf-btn-secondary" id="user-cancel">Cancel</button>
      `,
      ...options
    });

    this.user = options.user || null;
    this.isEdit = isEdit;
    this.onSave = options.onSave || (() => {});
  }

  _create() {
    super._create();

    const contentEl = this.element.querySelector('.sf-modal-content');
    contentEl.innerHTML = '<div id="user-form-container"></div>';

    this._createFields();
  }

  _createFields() {
    const container = this.element.querySelector('#user-form-container');

    // Username field
    this.usernameField = createField({
      id: 'user-username',
      label: 'Username',
      type: 'text',
      required: true,
      value: this.user?.username || '',
      validate: (val) => {
        if (val.length < 3) return 'Username must be at least 3 characters';
        return true;
      }
    });
    container.appendChild(this.usernameField);

    // Make username read-only when editing
    if (this.isEdit) {
      const input = this.usernameField.querySelector('input');
      input.readOnly = true;
      input.style.opacity = '0.7';
      input.style.cursor = 'not-allowed';
    }

    // Password field
    this.passwordField = createField({
      id: 'user-password',
      label: this.isEdit ? 'New Password (leave blank to keep)' : 'Password',
      type: 'password',
      required: !this.isEdit,
      validate: (val) => {
        if (!this.isEdit && val.length < 6) return 'Password must be at least 6 characters';
        if (this.isEdit && val && val.length < 6) return 'Password must be at least 6 characters';
        return true;
      }
    });
    container.appendChild(this.passwordField);

    // Admin checkbox
    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.className = 'sf-field';
    checkboxWrapper.style.marginTop = '16px';
    checkboxWrapper.innerHTML = `
      <label class="sf-checkbox">
        <input type="checkbox" class="sf-checkbox-input" id="user-is-admin" ${this.user?.is_admin ? 'checked' : ''}>
        <span class="sf-checkbox-label">Administrator</span>
      </label>
    `;
    container.appendChild(checkboxWrapper);
  }

  _bindEvents() {
    // Save button
    const saveBtn = this.element.querySelector('#user-save');
    saveBtn.addEventListener('click', () => this._save());

    // Cancel button
    const cancelBtn = this.element.querySelector('#user-cancel');
    cancelBtn.addEventListener('click', () => this.close());

    // Enter key to submit
    this.element.querySelectorAll('input[type="text"], input[type="password"]').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._save();
      });
    });
  }

  async _save() {
    // Validate fields (skip username validation when editing since it's read-only)
    const usernameValid = this.isEdit ? true : validateField(this.usernameField);
    const passwordValid = validateField(this.passwordField);

    if (!usernameValid || !passwordValid) return;

    const username = getFieldValue(this.usernameField).trim();
    const password = getFieldValue(this.passwordField);
    const isAdmin = this.element.querySelector('#user-is-admin').checked;

    // Disable save button
    const saveBtn = this.element.querySelector('#user-save');
    saveBtn.disabled = true;
    saveBtn.textContent = this.isEdit ? 'Saving...' : 'Creating...';

    try {
      let res;

      if (this.isEdit) {
        // Update existing user (username cannot be changed)
        const body = { isAdmin };
        if (password) body.password = password;

        res = await auth.fetch(`/api/users/${this.user.id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        // Create new user
        const body = { username, password, isAdmin };

        res = await auth.fetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Operation failed');
      }

      const data = await res.json();

      toast.success(this.isEdit ? 'User updated' : 'User created');
      this.close();
      this.onSave(data);
    } catch (err) {
      console.error('Failed to save user:', err);

      // Re-enable button
      saveBtn.disabled = false;
      saveBtn.textContent = this.isEdit ? 'Save Changes' : 'Create User';

      if (err.message.includes('Username') || err.message.includes('exists')) {
        setFieldError(this.usernameField, err.message);
      } else {
        toast.error(err.message);
      }
    }
  }
}

export default UserModal;
