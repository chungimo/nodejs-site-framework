/**
 * Site Framework - Menu Component
 * ============================================
 *
 * Hamburger dropdown menu with staggered animation.
 * Supports login state-based item visibility.
 *
 * USAGE:
 *   import { Menu } from './site-framework/js/menu.js';
 *
 *   const menu = new Menu({
 *     containerId: 'menu-container',
 *     isLoggedIn: false,
 *     onItemClick: (id, event) => { ... }
 *   });
 *   menu.create();
 */

export class Menu {
  constructor(options = {}) {
    this.containerId = options.containerId || 'menu-container';
    this.isOpen = false;
    this.isLoggedIn = options.isLoggedIn || false;
    this.onItemClick = options.onItemClick || (() => {});

    this.menuItems = [
      { id: 'account', label: 'Login', loggedInLabel: 'Account', iconClass: 'sf-icon-user', showWhenLoggedOut: true, showWhenLoggedIn: true },
      { id: 'logs', label: 'Logs', iconClass: 'sf-icon-logs', showWhenLoggedIn: true },
      { id: 'settings', label: 'Settings', iconClass: 'sf-icon-settings', showWhenLoggedIn: true },
      { id: 'logout', label: 'Logout', iconClass: 'sf-icon-logout', showWhenLoggedIn: true }
    ];

    this.element = null;
    this.dropdownElement = null;
  }

  create() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Menu container #${this.containerId} not found`);
      return null;
    }

    // Create menu wrapper
    this.element = document.createElement('div');
    this.element.className = 'menu-wrapper';
    this.element.innerHTML = this.render();
    container.appendChild(this.element);

    // Cache dropdown reference
    this.dropdownElement = this.element.querySelector('.menu-dropdown');

    // Bind events
    this.bindEvents();

    return this.element;
  }

  render() {
    const items = this.getVisibleItems();

    return `
      <button type="button" class="menu-hamburger" aria-label="Menu" aria-expanded="false" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other" autocomplete="off">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
      <div class="menu-dropdown sf-glass-panel" aria-hidden="true" data-1p-ignore="true" data-lpignore="true" role="menu">
        <div class="menu-items" data-1p-ignore="true" data-lpignore="true">
          ${items.map((item, index) => `
            <button type="button" class="menu-item" data-id="${item.id}" style="--item-index: ${index}" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other" role="menuitem" autocomplete="off">
              <span class="menu-item-icon"><i class="sf-icon ${item.iconClass}"></i></span>
              <span class="menu-item-label">${this.isLoggedIn && item.loggedInLabel ? item.loggedInLabel : item.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  getVisibleItems() {
    return this.menuItems.filter(item => {
      if (this.isLoggedIn) {
        // When logged in, show items with showWhenLoggedIn flag
        return item.showWhenLoggedIn === true;
      } else {
        // When logged out, only show items with showWhenLoggedOut flag
        return item.showWhenLoggedOut === true;
      }
    });
  }

  bindEvents() {
    const hamburger = this.element.querySelector('.menu-hamburger');
    const menuItems = this.element.querySelectorAll('.menu-item');

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Handle menu item clicks
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const id = item.dataset.id;
        this.onItemClick(id, e);
        this.close();
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.element.contains(e.target)) {
        this.close();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    const hamburger = this.element.querySelector('.menu-hamburger');
    const dropdown = this.element.querySelector('.menu-dropdown');

    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('open');
    dropdown.setAttribute('aria-hidden', 'false');
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    const hamburger = this.element.querySelector('.menu-hamburger');
    const dropdown = this.element.querySelector('.menu-dropdown');

    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('open');
    dropdown.setAttribute('aria-hidden', 'true');
  }

  setLoggedIn(isLoggedIn) {
    this.isLoggedIn = isLoggedIn;
    this.refresh();
  }

  refresh() {
    const itemsContainer = this.element.querySelector('.menu-items');
    const items = this.getVisibleItems();

    itemsContainer.innerHTML = items.map((item, index) => `
      <button type="button" class="menu-item" data-id="${item.id}" style="--item-index: ${index}" data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other" role="menuitem" autocomplete="off">
        <span class="menu-item-icon"><i class="sf-icon ${item.iconClass}"></i></span>
        <span class="menu-item-label">${this.isLoggedIn && item.loggedInLabel ? item.loggedInLabel : item.label}</span>
      </button>
    `).join('');

    // Rebind menu item events
    const menuItems = this.element.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const id = item.dataset.id;
        this.onItemClick(id, e);
        this.close();
      });
    });
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

export default Menu;
