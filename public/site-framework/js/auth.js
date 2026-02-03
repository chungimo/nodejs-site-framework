/**
 * Site Framework - Client-side Auth Module
 * ============================================
 *
 * USAGE:
 *   import { auth } from './site-framework/js/auth.js';
 *
 *   // Login
 *   const result = await auth.login(username, password);
 *
 *   // Check if logged in
 *   if (auth.isLoggedIn()) { ... }
 *
 *   // Get current user
 *   const user = auth.getUser();
 *
 *   // Logout
 *   auth.logout();
 */

const TOKEN_KEY = 'sf_auth_token';
const USER_KEY = 'sf_auth_user';

class AuthManager {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    this.user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    this.onAuthChange = null;
  }

  /**
   * Login with username and password
   * @returns {Object} { success, user, error }
   */
  async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store token and user
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      // Notify listeners
      if (this.onAuthChange) {
        this.onAuthChange(true, this.user);
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      if (this.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Clear local state
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Notify listeners
    if (this.onAuthChange) {
      this.onAuthChange(false, null);
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.token;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.user?.isAdmin === true;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get auth token
   */
  getToken() {
    return this.token;
  }

  /**
   * Make authenticated API request
   */
  async fetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 - token expired
    if (response.status === 401) {
      this.logout();
    }

    return response;
  }

  /**
   * Refresh current user info from server
   */
  async refreshUser() {
    if (!this.token) return null;

    try {
      const response = await this.fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        this.user = data;
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }

    return null;
  }

  /**
   * Set callback for auth state changes
   */
  setOnAuthChange(callback) {
    this.onAuthChange = callback;
  }
}

export const auth = new AuthManager();
export default auth;
