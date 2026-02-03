/**
 * Site Framework - Form Field Utilities
 * ============================================
 *
 * USAGE:
 *   import { createField, validateField } from './site-framework/js/field.js';
 *
 *   // Create an IFTA-style field (autofill blocked by default)
 *   const nameField = createField({
 *     id: 'user-name',
 *     label: 'Username',
 *     type: 'text',
 *     required: true
 *   });
 *
 *   // Create a login field (allow browser autofill)
 *   const loginField = createField({
 *     id: 'login-user',
 *     label: 'Username',
 *     type: 'text',
 *     autocomplete: 'username',
 *     allowAutofill: true
 *   });
 *
 *   container.appendChild(nameField);
 */

/**
 * Create an IFTA-style form field
 * @param {Object} options
 * @param {string} options.id - Field ID
 * @param {string} options.label - Field label
 * @param {string} options.type - Input type (text, password, email, etc.)
 * @param {boolean} options.required - Is field required
 * @param {string} options.help - Help text (shown in info icon)
 * @param {string} options.hint - Hint text (shown below field)
 * @param {string} options.placeholder - Placeholder (usually same as label)
 * @param {string} options.value - Initial value
 * @param {string} options.autocomplete - Autocomplete attribute
 * @param {string} options.name - Input name attribute
 * @param {boolean} options.ignorePasswordManagers - Add attributes to prevent 1Password/LastPass autofill (default: true)
 * @param {boolean} options.allowAutofill - Set to true to allow browser autofill (for login fields)
 * @param {Function} options.validate - Custom validation function
 */
export function createField(options) {
  const {
    id,
    label,
    type = 'text',
    required = false,
    help = '',
    hint = '',
    placeholder = ' ',
    value = '',
    autocomplete = 'off',
    name = '',
    ignorePasswordManagers = true,  // Default: block password managers
    allowAutofill = false,          // Default: block browser autofill
    validate = null
  } = options;

  // If allowAutofill is true, don't block password managers either
  const shouldIgnorePM = allowAutofill ? false : ignorePasswordManagers;

  const wrapper = document.createElement('div');
  wrapper.className = `sf-field ${required ? 'sf-field-required' : ''}`;

  // Build password manager ignore attributes
  const pmIgnoreAttrs = shouldIgnorePM
    ? 'data-1p-ignore data-lpignore="true" data-form-type="other"'
    : '';

  wrapper.innerHTML = `
    <input
      type="${type}"
      id="${id}"
      class="sf-field-input"
      placeholder="${placeholder}"
      value="${escapeAttr(value)}"
      autocomplete="${autocomplete}"
      ${name ? `name="${name}"` : ''}
      ${pmIgnoreAttrs}
      ${required ? 'required' : ''}
    >
    <label class="sf-field-label" for="${id}">${label}</label>
    ${help ? `<span class="sf-field-help" data-help="${escapeAttr(help)}">i</span>` : ''}
    <span class="sf-field-error-message"></span>
    ${hint ? `<span class="sf-field-hint">${hint}</span>` : ''}
  `;

  // Store validation function
  if (validate) {
    wrapper._validate = validate;
  }

  // Add validation on blur
  const input = wrapper.querySelector('input');
  input.addEventListener('blur', () => {
    validateField(wrapper);
  });

  // Clear error on input
  input.addEventListener('input', () => {
    wrapper.classList.remove('sf-field-error');
  });

  return wrapper;
}

/**
 * Validate a field
 * @param {HTMLElement} fieldWrapper - The .sf-field wrapper element
 * @returns {boolean} - Is valid
 */
export function validateField(fieldWrapper) {
  const input = fieldWrapper.querySelector('input, select, textarea');
  const errorEl = fieldWrapper.querySelector('.sf-field-error-message');

  // Clear previous error
  fieldWrapper.classList.remove('sf-field-error');

  // Required check
  if (input.required && !input.value.trim()) {
    setFieldError(fieldWrapper, 'This field is required');
    return false;
  }

  // Email validation
  if (input.type === 'email' && input.value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.value)) {
      setFieldError(fieldWrapper, 'Please enter a valid email address');
      return false;
    }
  }

  // Custom validation
  if (fieldWrapper._validate) {
    const result = fieldWrapper._validate(input.value);
    if (result !== true) {
      setFieldError(fieldWrapper, result || 'Invalid value');
      return false;
    }
  }

  return true;
}

/**
 * Set error on a field
 */
export function setFieldError(fieldWrapper, message) {
  fieldWrapper.classList.add('sf-field-error');
  const errorEl = fieldWrapper.querySelector('.sf-field-error-message');
  if (errorEl) {
    errorEl.textContent = message;
  }
}

/**
 * Clear error on a field
 */
export function clearFieldError(fieldWrapper) {
  fieldWrapper.classList.remove('sf-field-error');
}

/**
 * Get field value
 */
export function getFieldValue(fieldWrapper) {
  const input = fieldWrapper.querySelector('input, select, textarea');
  return input ? input.value : '';
}

/**
 * Set field value
 */
export function setFieldValue(fieldWrapper, value) {
  const input = fieldWrapper.querySelector('input, select, textarea');
  if (input) {
    input.value = value;
    // Trigger input event for label animation
    input.dispatchEvent(new Event('input'));
  }
}

/**
 * Validate all fields in a form
 * @param {HTMLElement} form - Form or container element
 * @returns {boolean} - All valid
 */
export function validateForm(form) {
  const fields = form.querySelectorAll('.sf-field');
  let isValid = true;

  fields.forEach(field => {
    if (!validateField(field)) {
      isValid = false;
    }
  });

  return isValid;
}

/**
 * Get all form values as object
 */
export function getFormValues(form) {
  const values = {};
  const inputs = form.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    if (input.id) {
      if (input.type === 'checkbox') {
        values[input.id] = input.checked;
      } else {
        values[input.id] = input.value;
      }
    }
  });

  return values;
}

/**
 * Check if form has been modified (is dirty)
 */
export function isFormDirty(form, originalValues = {}) {
  const currentValues = getFormValues(form);

  for (const key of Object.keys(currentValues)) {
    if (currentValues[key] !== (originalValues[key] || '')) {
      return true;
    }
  }

  return false;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default { createField, validateField, validateForm, getFormValues, isFormDirty };
