# Site Framework

A reusable, modular web application framework providing authentication, user management, settings, and logging functionality. Designed to be copy-and-pasted into new projects with minimal configuration.

## Quick Start

### 1. Install Dependencies

```bash
npm install better-sqlite3 bcrypt jsonwebtoken cookie-parser
```

### 2. Backend Setup

```javascript
// In your Express app
const framework = require('./site-framework');

app.use(cookieParser());
app.use(express.json());

// Add framework routes
app.use('/api', framework.routes);
```

### 3. Frontend Setup

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="site-framework/css/variables.css">
<link rel="stylesheet" href="site-framework/css/components.css">
<link rel="stylesheet" href="site-framework/css/modal.css">
<link rel="stylesheet" href="site-framework/css/notifications.css">
```

```javascript
// In your JavaScript
import { auth } from './site-framework/js/auth.js';
import { toast } from './site-framework/js/toast.js';
import { Modal, SettingsModal, LogsModal } from './site-framework/js/index.js';
```

## Architecture

```
site-framework/
├── css/
│   ├── variables.css      # Theme variables (colors, spacing, etc.)
│   ├── components.css     # Buttons, fields, tables, toasts, icons
│   ├── modal.css          # Modal system styles
│   └── notifications.css  # Notification channel form styles
├── js/
│   ├── index.js           # Main exports
│   ├── auth.js            # Client-side authentication
│   ├── modal.js           # Modal base class
│   ├── settings.js        # Settings modal with sidebar
│   ├── logs.js            # Logs modal with terminal view
│   ├── toast.js           # Toast notifications
│   ├── table.js           # Sortable table component
│   ├── field.js           # Form field utilities
│   ├── menu.js            # Hamburger menu component
│   ├── loginModal.js      # Login modal dialog
│   ├── accountModal.js    # User account modal (change password)
│   ├── userModal.js       # Admin user edit modal
│   ├── usersSection.js    # Users settings section
│   └── notifications/
│       ├── index.js       # Notification module exports & API
│       ├── channels.js    # Channel type configurations
│       └── forms.js       # Notification channel form component
└── README.md              # This file

src/site-framework/
├── index.js               # Backend entry point
├── database.js            # SQLite database setup & notification storage
├── auth.js                # JWT authentication middleware
└── routes.js              # API routes
```

## Configuration

### Theme Customization

Edit `css/variables.css` to change the entire look:

```css
:root {
  --sf-primary: #22c55e;              /* Primary accent color (green) */
  --sf-bg-body: #ffffff;              /* Background color (white) */
  --sf-bg-panel: #ffffff;             /* Panel/modal background */
  --sf-text-primary: #111827;         /* Primary text (dark) */
  --sf-text-secondary: #6b7280;       /* Secondary text (gray) */
}
```

### Environment Variables

```bash
JWT_SECRET=your-secret-key-here    # Required for production
JWT_EXPIRY=24h                     # Token expiration (default: 24h)
```

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login with username/password |
| `/api/auth/logout` | POST | Revoke current token |
| `/api/auth/refresh` | POST | Get new token |
| `/api/auth/me` | GET | Get current user info |

### Users (Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | List all users |
| `/api/users` | POST | Create user |
| `/api/users/:id` | GET | Get user by ID |
| `/api/users/:id` | PUT | Update user |
| `/api/users/:id` | DELETE | Delete user |
| `/api/users/:id/api-key` | POST | Generate API key |

### Logs (Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logs` | GET | Get recent logs |
| `/api/logs` | DELETE | Clear old logs |

### Settings (Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | Get all settings |
| `/api/settings` | PUT | Update settings |

### Notification Channels (Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/channels` | GET | Get all configured channels |
| `/api/notifications/channels/:type` | GET | Get specific channel config |
| `/api/notifications/channels/:type` | PUT | Save channel configuration |
| `/api/notifications/channels/:type` | DELETE | Delete channel configuration |
| `/api/notifications/channels/:type/test` | POST | Send test notification |

### Account (Authenticated Users)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/account/password` | PUT | Change current user's password |

## Frontend Components

### Modal

```javascript
import { Modal, ConfirmModal } from './site-framework/js/modal.js';

// Basic modal
const modal = new Modal({
  title: 'My Modal',
  content: '<p>Content here</p>',
  footer: '<button class="sf-btn sf-btn-primary">Save</button>',
  closable: true,
  onClose: () => console.log('closed')
});
modal.open();

// Confirmation dialog
const confirm = new ConfirmModal({
  title: 'Delete Item',
  message: 'Are you sure?',
  confirmText: 'Delete',
  confirmStyle: 'danger',
  onConfirm: () => { /* delete logic */ }
});
confirm.open();
```

### Settings Modal

```javascript
import { SettingsModal, createUsersSection, createNotificationsSection } from './site-framework/js/index.js';

const settings = new SettingsModal({
  defaultSection: 'users',
  sections: [
    {
      id: 'general',
      label: 'General',
      icon: '<i class="sf-icon sf-icon-settings"></i>',
      content: '<p>Settings here</p>'
    },
    {
      id: 'users',
      label: 'Users',
      icon: '<i class="sf-icon sf-icon-users"></i>',
      content: createUsersSection  // Built-in users management table
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '<i class="sf-icon sf-icon-notifications"></i>',
      content: createNotificationsSection  // Built-in notification channels
    }
  ]
});
settings.open();
```

Available icons: `sf-icon-settings`, `sf-icon-user`, `sf-icon-users`, `sf-icon-logs`, `sf-icon-notifications`

### Toast Notifications

```javascript
import { toast } from './site-framework/js/toast.js';

toast.info('Information message');
toast.success('Operation completed!');
toast.warning('Warning message');
toast.error('Error occurred');

// Logout with countdown
toast.logout(() => {
  auth.logout();
  window.location.reload();
}, 3000);
```

### IFTA-Style Form Fields

```html
<div class="sf-field sf-field-required">
  <input type="text" id="username" class="sf-field-input" placeholder=" ">
  <label class="sf-field-label" for="username">Username</label>
  <span class="sf-field-error-message"></span>
</div>
```

```javascript
import { validateField, validateForm } from './site-framework/js/field.js';

// Validate single field
const isValid = validateField(fieldWrapper);

// Validate entire form
if (validateForm(formElement)) {
  // Submit
}
```

### Sortable Table

```javascript
import { Table } from './site-framework/js/table.js';

const table = new Table({
  container: document.getElementById('my-table'),
  columns: [
    { id: 'name', label: 'Name', sortable: true },
    { id: 'email', label: 'Email', sortable: true },
    { id: 'actions', label: '', render: (row) => `<button>Edit</button>` }
  ],
  data: [...],
  onRowClick: (row) => showEditModal(row)
});
```

### Authentication

```javascript
import { auth } from './site-framework/js/auth.js';

// Login
const result = await auth.login(username, password);
if (result.success) {
  console.log('Welcome', result.user.username);
}

// Check auth state
if (auth.isLoggedIn()) { ... }
if (auth.isAdmin()) { ... }

// Make authenticated requests
const response = await auth.fetch('/api/protected-endpoint');

// Logout
await auth.logout();
```

## Backend Usage

### Protect Routes

```javascript
const { auth } = require('./site-framework');

// Require authentication
app.get('/api/protected', auth.requireAuth, (req, res) => {
  // req.user contains: { id, username, isAdmin }
});

// Require admin
app.get('/api/admin-only', auth.requireAdmin, (req, res) => {
  // Only admins can access
});
```

### Database Access

```javascript
const { users, logs, settings } = require('./site-framework');

// Users
const allUsers = users.getAll();
const user = users.getById(id);
users.create(username, password, isAdmin);
users.update(id, { username, password, isAdmin });
users.delete(id);

// Logs
logs.add('info', 'User logged in', userId);
const recentLogs = logs.getRecent(100);

// Settings
settings.set('siteName', 'My App');
const value = settings.get('siteName', 'default');
```

## Design Principles

### Button Order
- Buttons aligned right
- Positive action (Save, Submit) on left, highlighted
- Negative action (Cancel) on right, subtle

### Pop-up Behavior
- Red X close button in top-right
- Click outside to close (with dirty form confirmation)
- Escape key closes
- Z-index stacking for multiple modals

### Form Fields (IFTA Style)
- Inline Floating Top-Aligned labels
- Label animates up when focused/filled
- Required fields marked with red asterisk
- Error states with red border and message
- Optional info icon with hover tooltip

## Database

SQLite database is created automatically in `db/app.db` on first run. The `db/` folder is gitignored.

### Default Admin User
- Username: `admin`
- Password: `admin`
- **CHANGE THIS IN PRODUCTION**

### Schema

```sql
users (id, username, password_hash, api_key_hash, api_key_preview, is_admin, created_at, last_login)
sessions (id, user_id, token_id, created_at, expires_at, revoked)
logs (id, timestamp, level, message, user_id, metadata)
settings (key, value, updated_at)
notification_channels (id, channel_type, enabled, config, created_at, updated_at)
```

Note: The `notification_channels.config` field stores JSON with sensitive fields (like SMTP passwords) encrypted using AES-256-CBC.

## Security Notes

1. **JWT_SECRET**: Always set via environment variable in production
2. **Password Hashing**: Uses bcrypt with 12 rounds
3. **Session Tracking**: Tokens can be revoked server-side
4. **API Keys**: Support for API key authentication (X-Api-Key header)
5. **CORS**: Configure appropriately for your deployment

## Extending the Framework

### Add New Settings Section

```javascript
const settings = new SettingsModal({
  sections: [
    ...existingSections,
    {
      id: 'custom',
      label: 'Custom Settings',
      icon: '🎨',
      content: () => {
        const el = document.createElement('div');
        // Build your settings UI
        return el;
      }
    }
  ]
});
```

### Add New API Routes

```javascript
// In your app
const { auth } = require('./site-framework');

app.get('/api/my-endpoint', auth.requireAuth, (req, res) => {
  // Your logic here
});
```

### Custom Log Levels

```javascript
const { logs } = require('./site-framework');

logs.add('success', 'Payment processed', userId, { amount: 100 });
logs.add('warn', 'Rate limit approaching', userId);
```

### Add New Notification Channel

Define custom channel types in `js/notifications/channels.js`:

```javascript
export const CHANNEL_TYPES = {
  // ...existing channels...
  myChannel: {
    id: 'myChannel',
    name: 'My Custom Channel',
    icon: '/icons/icon-mychannel.png',  // or emoji like '📢'
    description: 'Send notifications via custom service',
    fields: [
      {
        id: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        help: 'Your service API key'
      },
      {
        id: 'endpoint',
        label: 'Endpoint URL',
        type: 'text',
        required: true
      }
    ],
    sensitive: ['apiKey']  // Fields to encrypt in database
  }
};
```

Then add the backend handler in `src/site-framework/routes.js` for the test endpoint.

## Notification Channels

The framework includes a complete notification system with support for:

- **Microsoft Teams** - Incoming Webhook integration
- **Slack** - Incoming Webhook with channel/username override
- **Discord** - Webhook with custom bot name and avatar
- **Email (SMTP)** - Full SMTP configuration with TLS support
- **Generic Webhook** - Custom endpoints with auth (Bearer, API Key, Basic)

### Using the Notification API

```javascript
import { NotificationAPI } from './site-framework/js/notifications/index.js';

// Get all configured channels
const channels = await NotificationAPI.getAll();

// Save channel configuration
await NotificationAPI.save('teams', {
  enabled: true,
  webhookUrl: 'https://outlook.office.com/webhook/...'
});

// Test a notification
await NotificationAPI.test('teams', { webhookUrl: '...' });

// Delete channel configuration
await NotificationAPI.delete('teams');
```

### Sensitive Field Encryption

Sensitive fields (like SMTP passwords) are automatically encrypted with AES-256-CBC before storage. The encryption key is derived from the JWT_SECRET environment variable.
