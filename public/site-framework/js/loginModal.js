/**
 * Site Framework - Login Modal
 * ============================================
 *
 * Login form modal using site framework components.
 *
 * USAGE:
 *   import { LoginModal } from './site-framework/js/loginModal.js';
 *
 *   const modal = new LoginModal({
 *     onLoginSuccess: (user) => { ... }
 *   });
 *   modal.open();
 */

import { Modal } from './modal.js';
import { auth } from './auth.js';

export class LoginModal extends Modal {
  constructor(options = {}) {
    super({
      title: 'Login',
      closable: true,
      content: `
        <div class="sf-field sf-field-required">
          <input type="text" id="login-username" name="username" class="sf-field-input" placeholder=" " autocomplete="username" data-form-type="login">
          <label class="sf-field-label" for="login-username">Username</label>
        </div>
        <div class="sf-field sf-field-required">
          <input type="password" id="login-password" name="password" class="sf-field-input" placeholder=" " autocomplete="current-password" data-form-type="login">
          <label class="sf-field-label" for="login-password">Password</label>
        </div>
      `,
      footer: `
        <button class="sf-btn sf-btn-primary" id="login-submit">Login</button>
        <button class="sf-btn sf-btn-secondary" id="login-cancel">Cancel</button>
      `,
      ...options
    });

    this.onLoginSuccess = options.onLoginSuccess || (() => {});
  }

  _bindEvents() {
    const submitBtn = this.element.querySelector('#login-submit');
    const cancelBtn = this.element.querySelector('#login-cancel');
    const usernameInput = this.element.querySelector('#login-username');
    const passwordInput = this.element.querySelector('#login-password');

    submitBtn.addEventListener('click', () => this.handleLogin());
    cancelBtn.addEventListener('click', () => this.close());

    // Submit on Enter key
    const handleEnter = (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    };
    usernameInput.addEventListener('keydown', handleEnter);
    passwordInput.addEventListener('keydown', handleEnter);

    // Focus username input
    setTimeout(() => usernameInput.focus(), 100);
  }

  async handleLogin() {
    const username = this.element.querySelector('#login-username').value.trim();
    const password = this.element.querySelector('#login-password').value;

    if (!username || !password) {
      this.showError('Please enter both username and password');
      return;
    }

    // Disable button during login
    const submitBtn = this.element.querySelector('#login-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    const result = await auth.login(username, password);

    if (result.success) {
      this.close();
      this.onLoginSuccess(result.user);
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
      this.showError(result.error || 'Login failed');
    }
  }
}

export default LoginModal;
