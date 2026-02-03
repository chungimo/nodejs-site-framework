/**
 * Site Framework - Notification Channel Forms
 * ============================================
 *
 * USAGE:
 *   import { NotificationChannelForm } from './notifications/forms.js';
 *
 *   const form = new NotificationChannelForm({
 *     channelType: 'teams',
 *     container: document.getElementById('teams-form'),
 *     onSave: async (data) => { ... },
 *     onTest: async (data) => { ... }
 *   });
 *
 * CUSTOMIZATION:
 * - Override createFieldElement for custom field rendering
 * - Add custom validation in channel configs
 */

import { createField, validateForm, getFormValues } from '../field.js';
import { getChannelConfig, isSensitiveField } from './channels.js';

/**
 * Notification Channel Form Component
 */
export class NotificationChannelForm {
  /**
   * @param {Object} options
   * @param {string} options.channelType - Channel type ID (teams, email, etc.)
   * @param {HTMLElement} options.container - Container element for the form
   * @param {Object} options.initialValues - Initial field values
   * @param {Function} options.onSave - Callback when form is saved
   * @param {Function} options.onTest - Callback for test button
   * @param {Function} options.onToggle - Callback when enabled/disabled
   */
  constructor(options) {
    this.channelType = options.channelType;
    this.container = options.container;
    this.initialValues = options.initialValues || {};
    this.onSave = options.onSave || (() => {});
    this.onTest = options.onTest || null;
    this.onToggle = options.onToggle || (() => {});

    this.config = getChannelConfig(this.channelType);
    if (!this.config) {
      throw new Error(`Unknown channel type: ${this.channelType}`);
    }

    this.enabled = this.initialValues.enabled || false;
    this.formElement = null;
    this.fieldElements = {};

    this._render();
  }

  /**
   * Render the channel form
   */
  _render() {
    const card = document.createElement('div');
    card.className = `sf-notify-channel ${this.enabled ? 'sf-expanded' : ''}`;
    card.dataset.channelType = this.channelType;

    // Render icon as img if it's a path, otherwise as text (emoji)
    const iconHtml = this.config.icon.includes('/')
      ? `<img src="${this.config.icon}" alt="${this.config.name}" class="sf-notify-channel-icon">`
      : `<span class="sf-notify-channel-icon">${this.config.icon}</span>`;

    card.innerHTML = `
      <div class="sf-notify-channel-header">
        <div class="sf-notify-channel-info">
          ${iconHtml}
          <div>
            <div class="sf-notify-channel-name">${this.config.name}</div>
            <div class="sf-notify-channel-desc">${this.config.description}</div>
          </div>
        </div>
        <label class="sf-notify-toggle">
          <input type="checkbox" ${this.enabled ? 'checked' : ''}>
          <span class="sf-notify-toggle-slider"></span>
        </label>
      </div>
      <div class="sf-notify-channel-body">
        <form class="sf-notify-form" data-1p-ignore data-lpignore="true" data-form-type="other" autocomplete="off">
          <!-- Hidden honeypot fields to absorb browser autofill -->
          <input type="text" name="prevent_autofill_1" style="display:none !important" tabindex="-1" autocomplete="off">
          <input type="password" name="prevent_autofill_2" style="display:none !important" tabindex="-1" autocomplete="off">
        </form>
      </div>
    `;

    this.formElement = card.querySelector('.sf-notify-form');
    this._renderFields();
    this._renderActions();
    this._bindEvents(card);

    this.container.innerHTML = '';
    this.container.appendChild(card);
  }

  /**
   * Render form fields based on channel config
   */
  _renderFields() {
    const config = this.config;

    // If fieldRows defined, use row layout
    if (config.fieldRows) {
      config.fieldRows.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'sf-notify-form-row';

        row.forEach(fieldId => {
          const fieldConfig = config.fields.find(f => f.id === fieldId);
          if (fieldConfig) {
            const fieldEl = this._createFieldElement(fieldConfig);
            if (fieldConfig.size === 'sm') {
              fieldEl.classList.add('sf-field-sm');
            }
            rowEl.appendChild(fieldEl);
          }
        });

        this.formElement.appendChild(rowEl);
      });

      // Handle checkbox fields separately (TLS toggle, etc.)
      config.fields.forEach(fieldConfig => {
        if (fieldConfig.type === 'checkbox' && !config.fieldRows.flat().includes(fieldConfig.id)) {
          const fieldEl = this._createFieldElement(fieldConfig);
          this.formElement.appendChild(fieldEl);
        }
      });
    } else {
      // Render fields in order
      config.fields.forEach(fieldConfig => {
        const fieldEl = this._createFieldElement(fieldConfig);
        this.formElement.appendChild(fieldEl);
      });
    }
  }

  /**
   * Create a form field element
   */
  _createFieldElement(fieldConfig) {
    const value = this.initialValues[fieldConfig.id] ?? fieldConfig.value ?? '';
    // Generate unique name to prevent password manager detection
    const uniqueName = `sf-notify-${this.channelType}-${fieldConfig.id}-${Date.now()}`;

    // Handle checkbox type
    if (fieldConfig.type === 'checkbox') {
      const wrapper = document.createElement('div');
      wrapper.className = 'sf-field';
      wrapper.innerHTML = `
        <label class="sf-checkbox">
          <input type="checkbox" id="${fieldConfig.id}" class="sf-checkbox-input"
                 name="${uniqueName}"
                 data-1p-ignore data-lpignore="true" data-form-type="other"
                 ${value ? 'checked' : ''}>
          <span class="sf-checkbox-label">${fieldConfig.label}</span>
        </label>
        ${fieldConfig.hint ? `<span class="sf-field-hint">${fieldConfig.hint}</span>` : ''}
      `;
      this.fieldElements[fieldConfig.id] = wrapper;
      return wrapper;
    }

    // Handle select type
    if (fieldConfig.type === 'select') {
      const wrapper = document.createElement('div');
      wrapper.className = `sf-field ${fieldConfig.required ? 'sf-field-required' : ''}`;
      wrapper.innerHTML = `
        <select id="${fieldConfig.id}" class="sf-field-input"
                name="${uniqueName}"
                data-1p-ignore data-lpignore="true" data-form-type="other">
          ${fieldConfig.options.map(opt => `
            <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
              ${opt.label}
            </option>
          `).join('')}
        </select>
        <label class="sf-field-label" for="${fieldConfig.id}">${fieldConfig.label}</label>
        ${fieldConfig.help ? `<span class="sf-field-help" data-help="${fieldConfig.help}">i</span>` : ''}
        <span class="sf-field-error-message"></span>
        ${fieldConfig.hint ? `<span class="sf-field-hint">${fieldConfig.hint}</span>` : ''}
      `;
      this.fieldElements[fieldConfig.id] = wrapper;
      return wrapper;
    }

    // Standard input fields (text, password, email, number)
    const fieldEl = createField({
      id: fieldConfig.id,
      label: fieldConfig.label,
      type: fieldConfig.type,
      required: fieldConfig.required,
      help: fieldConfig.help,
      hint: fieldConfig.hint,
      value: isSensitiveField(this.channelType, fieldConfig.id) && value ? '' : value,
      autocomplete: 'off',
      name: uniqueName,
      ignorePasswordManagers: true,
      validate: fieldConfig.validate
    });

    // Add placeholder hint for sensitive fields with existing value
    if (isSensitiveField(this.channelType, fieldConfig.id) && this.initialValues[fieldConfig.id]) {
      const input = fieldEl.querySelector('input');
      if (input) {
        input.placeholder = '••••••••';
      }
    }

    this.fieldElements[fieldConfig.id] = fieldEl;
    return fieldEl;
  }

  /**
   * Render form action buttons
   */
  _renderActions() {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'sf-notify-form-actions';

    if (this.onTest) {
      actionsEl.innerHTML += `
        <button type="button" class="sf-notify-test-btn">
          <span>🔔</span> Test
        </button>
      `;
    }

    actionsEl.innerHTML += `
      <button type="submit" class="sf-btn sf-btn-primary">
        Save Configuration
      </button>
    `;

    this.formElement.appendChild(actionsEl);
  }

  /**
   * Bind event listeners
   */
  _bindEvents(card) {
    // Toggle enable/disable
    const toggleInput = card.querySelector('.sf-notify-toggle input');
    toggleInput.addEventListener('change', () => {
      this.enabled = toggleInput.checked;
      card.classList.toggle('sf-expanded', this.enabled);
      this.onToggle(this.enabled);
    });

    // Form submission
    this.formElement.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validateForm(this.formElement)) {
        return;
      }

      const values = this._getValues();
      await this.onSave(values);
    });

    // Test button
    const testBtn = card.querySelector('.sf-notify-test-btn');
    if (testBtn && this.onTest) {
      testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        try {
          const values = this._getValues();
          await this.onTest(values);
        } finally {
          testBtn.disabled = false;
        }
      });
    }

    // Handle conditional field visibility
    this._bindConditionalFields();
  }

  /**
   * Bind conditional field visibility
   */
  _bindConditionalFields() {
    this.config.fields.forEach(fieldConfig => {
      if (fieldConfig.showWhen) {
        const fieldEl = this.fieldElements[fieldConfig.id];
        if (fieldEl) {
          // Initial visibility
          this._updateConditionalVisibility(fieldConfig);

          // Listen for changes to controlling fields
          this.config.fields.forEach(f => {
            const input = this.formElement.querySelector(`#${f.id}`);
            if (input) {
              input.addEventListener('change', () => {
                this._updateConditionalVisibility(fieldConfig);
              });
            }
          });
        }
      }
    });
  }

  /**
   * Update visibility of a conditional field
   */
  _updateConditionalVisibility(fieldConfig) {
    const fieldEl = this.fieldElements[fieldConfig.id];
    if (!fieldEl || !fieldConfig.showWhen) return;

    const values = this._getValues();
    const shouldShow = fieldConfig.showWhen(values);
    fieldEl.style.display = shouldShow ? '' : 'none';
  }

  /**
   * Get current form values
   */
  _getValues() {
    const values = { enabled: this.enabled };

    this.config.fields.forEach(fieldConfig => {
      const el = this.formElement.querySelector(`#${fieldConfig.id}`);
      if (el) {
        if (fieldConfig.type === 'checkbox') {
          values[fieldConfig.id] = el.checked;
        } else {
          // For sensitive fields, only include if user entered new value
          if (isSensitiveField(this.channelType, fieldConfig.id)) {
            if (el.value) {
              values[fieldConfig.id] = el.value;
            }
            // If empty, don't include (preserve existing encrypted value)
          } else {
            values[fieldConfig.id] = el.value;
          }
        }
      }
    });

    return values;
  }

  /**
   * Get whether the channel is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    const card = this.container.querySelector('.sf-notify-channel');
    const toggle = card.querySelector('.sf-notify-toggle input');
    toggle.checked = enabled;
    card.classList.toggle('sf-expanded', enabled);
  }

  /**
   * Set field values
   */
  setValues(values) {
    Object.entries(values).forEach(([key, value]) => {
      const el = this.formElement.querySelector(`#${key}`);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = !!value;
        } else {
          // Don't show sensitive values
          if (!isSensitiveField(this.channelType, key)) {
            el.value = value;
          }
        }
      }
    });

    if (values.enabled !== undefined) {
      this.setEnabled(values.enabled);
    }
  }
}

export default { NotificationChannelForm };
