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
 *
 * Token is stored in an httpOnly cookie (set by the server).
 * Only user display info is kept in localStorage.
 */

const USER_KEY = 'sf_auth_user';

class AuthManager {
  constructor() {
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
        body: JSON.stringify({ username, password }),
        credentials: 'same-origin'
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store user info (token is in httpOnly cookie)
      this.user = data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      // Notify listeners
      if (this.onAuthChange) {
        this.onAuthChange(true, this.user);
      }

      const result = { success: true, user: data.user };
      if (data.mustChangePassword) {
        result.mustChangePassword = true;
      }
      return result;
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Clear local state
    this.user = null;
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
    return !!this.user;
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
   * Make authenticated API request.
   * Token is sent automatically via httpOnly cookie.
   */
  async fetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin'
    });

    // Handle 401 - token expired or invalid
    if (response.status === 401) {
      this.user = null;
      localStorage.removeItem(USER_KEY);
      if (this.onAuthChange) {
        this.onAuthChange(false, null);
      }
    }

    return response;
  }

  /**
   * Refresh current user info from server
   */
  async refreshUser() {
    if (!this.user) return null;

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
