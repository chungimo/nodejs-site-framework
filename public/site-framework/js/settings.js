/**
 * Site Framework - Settings Modal
 * ============================================
 *
 * USAGE:
 *   import { SettingsModal } from './site-framework/js/settings.js';
 *
 *   const settings = new SettingsModal({
 *     sections: [
 *       { id: 'general', label: 'General', icon: '⚙️', content: '...' },
 *       { id: 'users', label: 'Users', icon: '👥', content: '...' }
 *     ]
 *   });
 *   settings.open();
 *
 * CUSTOMIZATION:
 * - Add sections via constructor or addSection()
 * - Sections can have HTML content or render functions
 */

import { Modal } from './modal.js';

export class SettingsModal extends Modal {
  constructor(options = {}) {
    super({
      title: options.title || 'Settings',
      fullscreen: true,
      closable: true,
      ...options
    });

    this.sections = options.sections || [];
    // Validate defaultSection exists, otherwise use first section
    const requestedSection = options.defaultSection;
    const sectionExists = this.sections.some(s => s.id === requestedSection);
    this.activeSection = sectionExists ? requestedSection : (this.sections[0]?.id || null);
    this.onSectionChange = options.onSectionChange || (() => {});
  }

  /**
   * Add a section to settings
   */
  addSection(section) {
    this.sections.push(section);
    if (!this.activeSection) {
      this.activeSection = section.id;
    }
  }

  /**
   * Switch to a section
   */
  switchSection(sectionId) {
    this.activeSection = sectionId;
    this._updateActiveSection();
    this.onSectionChange(sectionId);
  }

  _create() {
    super._create();

    // Replace content with settings layout
    const contentEl = this.element.querySelector('.sf-modal-content');
    contentEl.innerHTML = '';
    contentEl.style.padding = '0';

    const layout = document.createElement('div');
    layout.className = 'sf-settings-layout';
    layout.innerHTML = `
      <nav class="sf-settings-sidebar">
        ${this.sections.map(s => `
          <button class="sf-settings-nav-item ${s.id === this.activeSection ? 'sf-active' : ''}"
                  data-section="${s.id}">
            <span class="sf-settings-nav-icon">${s.icon || ''}</span>
            <span>${s.label}</span>
          </button>
        `).join('')}
      </nav>
      <div class="sf-settings-content">
        ${this.sections.map(s => `
          <div class="sf-settings-section ${s.id === this.activeSection ? 'sf-active' : ''}"
               data-section="${s.id}">
            <h3 class="sf-settings-section-title">${s.label}</h3>
            <div class="sf-settings-section-content">
              ${typeof s.content === 'function' ? '' : (s.content || '')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    contentEl.appendChild(layout);

    // Render function content
    this.sections.forEach(s => {
      if (typeof s.content === 'function') {
        const container = layout.querySelector(`.sf-settings-section[data-section="${s.id}"] .sf-settings-section-content`);
        const content = s.content();
        if (typeof content === 'string') {
          container.innerHTML = content;
        } else {
          container.appendChild(content);
        }
      }
    });
  }

  _bindEvents() {
    // Section navigation
    const navItems = this.element.querySelectorAll('.sf-settings-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        this.switchSection(item.dataset.section);
      });
    });
  }

  _updateActiveSection() {
    // Update nav
    const navItems = this.element.querySelectorAll('.sf-settings-nav-item');
    navItems.forEach(item => {
      item.classList.toggle('sf-active', item.dataset.section === this.activeSection);
    });

    // Update content
    const sections = this.element.querySelectorAll('.sf-settings-section');
    sections.forEach(section => {
      section.classList.toggle('sf-active', section.dataset.section === this.activeSection);
    });
  }

  /**
   * Refresh a section's content
   */
  refreshSection(sectionId) {
    const section = this.sections.find(s => s.id === sectionId);
    if (!section) return;

    const container = this.element.querySelector(
      `.sf-settings-section[data-section="${sectionId}"] .sf-settings-section-content`
    );

    if (container && typeof section.content === 'function') {
      container.innerHTML = '';
      const content = section.content();
      if (typeof content === 'string') {
        container.innerHTML = content;
      } else {
        container.appendChild(content);
      }
    }
  }
}

export default SettingsModal;
