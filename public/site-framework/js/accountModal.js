/**
 * Site Framework - Account Modal
 * ============================================
 *
 * Self-service account modal for viewing profile and
 * changing username/password.
 *
 * USAGE:
 *   import { AccountModal } from './site-framework/js/accountModal.js';
 *
 *   const modal = new AccountModal({
 *     onUpdate: () => { ... }
 *   });
 *   modal.open();
 */

import { Modal, ConfirmModal } from './modal.js';
import { auth } from './auth.js';
import { toast } from './toast.js';
import { createField, validateField, setFieldError } from './field.js';

export class AccountModal extends Modal {
  constructor(options = {}) {
    super({
      title: 'Account',
      closable: true,
      ...options
    });

    this.onUpdate = options.onUpdate || (() => {});
    this.apiKey = null;
    this.apiKeyCreatedAt = null;
    this.apiKeyLastFour = null;
    this.hasApiKey = false;
  }

  _create() {
    super._create();

    const contentEl = this.element.querySelector('.sf-modal-content');
    contentEl.innerHTML = `
      <div class="sf-account-modal">
        <!-- Profile Section -->
        <div class="sf-account-section">
          <div class="sf-account-section-title">Profile</div>
          <div class="sf-account-info" id="account-profile">
            <span class="sf-account-info-label">Username</span>
            <span class="sf-account-info-value" id="account-username">Loading...</span>
          </div>
          <div class="sf-account-info" style="margin-top: 8px;">
            <span class="sf-account-info-label">Role</span>
            <span class="sf-account-info-value" id="account-role">-</span>
          </div>
        </div>

        <!-- Change Password Section -->
        <div class="sf-account-section">
          <div class="sf-account-section-title">Change Password</div>
          <div id="password-fields-container"></div>
          <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
            <button class="sf-btn sf-btn-secondary" id="save-password-btn">
              Save Password
            </button>
          </div>
        </div>

        <!-- API Key Section -->
        <div class="sf-account-section">
          <div class="sf-account-section-title">API Key</div>
          <div id="api-key-container">
            <span class="sf-api-key-loading">Loading...</span>
          </div>
        </div>
      </div>
    `;

    // Add footer
    const footerEl = this.element.querySelector('.sf-modal-footer');
    if (footerEl) {
      footerEl.innerHTML = `
        <button class="sf-btn sf-btn-secondary" id="account-close">Close</button>
      `;
    }

    this._createFields();
    this._loadAccountInfo();
  }

  _createFields() {
    // Password fields
    const passwordContainer = this.element.querySelector('#password-fields-container');

    this.currentPasswordField = createField({
      id: 'account-current-password',
      label: 'Current Password',
      type: 'password',
      required: true,
      allowAutofill: true,
      autocomplete: 'current-password'
    });
    passwordContainer.appendChild(this.currentPasswordField);

    this.newPasswordField = createField({
      id: 'account-new-password',
      label: 'New Password',
      type: 'password',
      required: true,
      validate: (val) => {
        if (val.length < 8) return 'Password must be at least 8 characters';
        return true;
      }
    });
    passwordContainer.appendChild(this.newPasswordField);

    this.confirmPasswordField = createField({
      id: 'account-confirm-password',
      label: 'Confirm New Password',
      type: 'password',
      required: true,
      validate: (val) => {
        const newPass = this.newPasswordField.querySelector('input').value;
        if (val !== newPass) return 'Passwords do not match';
        return true;
      }
    });
    passwordContainer.appendChild(this.confirmPasswordField);
  }

  async _loadAccountInfo() {
    try {
      const res = await auth.fetch('/api/account');
      if (!res.ok) throw new Error('Failed to load account');

      const data = await res.json();

      // Update profile display
      this.element.querySelector('#account-username').textContent = data.username;
      this.element.querySelector('#account-role').textContent = data.isAdmin ? 'Administrator' : 'User';

      // Update API key section
      this.hasApiKey = data.hasApiKey;
      this.apiKeyLastFour = data.apiKeyLastFour || null;
      this.apiKeyCreatedAt = data.apiKeyCreatedAt || null;
      this._renderApiKeySection();
    } catch (err) {
      console.error('Failed to load account:', err);
      toast.error('Failed to load account info');
    }
  }

  _renderApiKeySection() {
    const container = this.element.querySelector('#api-key-container');

    if (this.apiKey) {
      // Show newly generated key
      container.innerHTML = `
        <div class="sf-api-key-generated">
          <div class="sf-api-key-warning">
            Save this key now - it won't be shown again!
          </div>
          <div class="sf-api-key-value">
            <code id="api-key-value">${this.apiKey}</code>
            <button class="sf-btn sf-btn-icon sf-btn-secondary" id="copy-api-key" title="Copy">
              <i class="sf-icon sf-icon-copy"></i>
            </button>
          </div>
        </div>
      `;

      // Bind copy button
      container.querySelector('#copy-api-key').addEventListener('click', () => {
        navigator.clipboard.writeText(this.apiKey);
        toast.success('API key copied to clipboard');
      });
    } else if (this.hasApiKey) {
      // Has existing key - show last 4 chars and created timestamp
      const createdDate = this.apiKeyCreatedAt
        ? new Date(this.apiKeyCreatedAt).toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        : 'Unknown';

      container.innerHTML = `
        <div class="sf-api-key-status sf-api-key-active">
          <span class="sf-api-key-indicator"></span>
          <span>API key is active</span>
        </div>
        <div class="sf-api-key-info">
          <div class="sf-api-key-detail">
            <span class="sf-api-key-detail-label">Key ending:</span>
            <code class="sf-api-key-detail-value">...${this.apiKeyLastFour || '????'}</code>
          </div>
          <div class="sf-api-key-detail">
            <span class="sf-api-key-detail-label">Generated:</span>
            <span class="sf-api-key-detail-value">${createdDate}</span>
          </div>
        </div>
        <div class="sf-api-key-actions">
          <button class="sf-btn sf-btn-secondary" id="regenerate-api-key">
            <i class="sf-icon sf-icon-refresh"></i> Regenerate
          </button>
          <button class="sf-btn sf-btn-danger" id="revoke-api-key">
            Revoke
          </button>
        </div>
      `;

      container.querySelector('#regenerate-api-key').addEventListener('click', () => this._generateApiKey());
      container.querySelector('#revoke-api-key').addEventListener('click', () => this._revokeApiKey());
    } else {
      // No key
      container.innerHTML = `
        <div class="sf-api-key-status sf-api-key-inactive">
          <span class="sf-api-key-indicator"></span>
          <span>No API key configured</span>
        </div>
        <div class="sf-api-key-actions">
          <button class="sf-btn sf-btn-primary" id="generate-api-key">
            <i class="sf-icon sf-icon-key"></i> Generate API Key
          </button>
        </div>
      `;

      container.querySelector('#generate-api-key').addEventListener('click', () => this._generateApiKey());
    }
  }

  async _generateApiKey() {
    try {
      const res = await auth.fetch('/api/account/api-key', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate API key');

      const data = await res.json();
      this.apiKey = data.apiKey;
      this.apiKeyCreatedAt = data.createdAt;
      this.apiKeyLastFour = data.lastFour;
      this.hasApiKey = true;
      this._renderApiKeySection();
      toast.success('API key generated');
    } catch (err) {
      console.error('Failed to generate API key:', err);
      toast.error('Failed to generate API key');
    }
  }

  async _revokeApiKey() {
    const confirm = new ConfirmModal({
      title: 'Revoke API Key',
      message: 'Are you sure? Any applications using this key will stop working.',
      confirmText: 'Revoke',
      confirmStyle: 'danger',
      onConfirm: async () => {
        confirm.close();
        try {
          const res = await auth.fetch('/api/account/api-key', { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to revoke API key');

          this.apiKey = null;
          this.hasApiKey = false;
          this._renderApiKeySection();
          toast.success('API key revoked');
        } catch (err) {
          console.error('Failed to revoke API key:', err);
          toast.error('Failed to revoke API key');
        }
      }
    });
    confirm.open();
  }

  _bindEvents() {
    // Close button
    const closeBtn = this.element.querySelector('#account-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Save password
    const savePasswordBtn = this.element.querySelector('#save-password-btn');
    savePasswordBtn.addEventListener('click', () => this._savePassword());
  }

  async _savePassword() {
    // Validate all password fields
    const currentValid = validateField(this.currentPasswordField);
    const newValid = validateField(this.newPasswordField);
    const confirmValid = validateField(this.confirmPasswordField);

    if (!currentValid || !newValid || !confirmValid) return;

    const currentPassword = this.currentPasswordField.querySelector('input').value;
    const newPassword = this.newPasswordField.querySelector('input').value;

    try {
      const res = await auth.fetch('/api/account', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update password');
      }

      // Clear password fields
      this.currentPasswordField.querySelector('input').value = '';
      this.newPasswordField.querySelector('input').value = '';
      this.confirmPasswordField.querySelector('input').value = '';

      toast.success('Password updated');
      this.onUpdate();
    } catch (err) {
      console.error('Failed to update password:', err);
      if (err.message.includes('Current password')) {
        setFieldError(this.currentPasswordField, err.message);
      } else {
        toast.error(err.message);
      }
    }
  }
}

export default AccountModal;
