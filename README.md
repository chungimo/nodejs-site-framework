# Site Framework

A drop-in Node.js framework providing authentication, user management, settings, logging, and notification channels. Copy the `src/site-framework/` and `public/site-framework/` folders into any Express project and wire up in minutes.

---

## Agent Integration Guide

This section is written for an AI agent (or developer) picking up this codebase for the first time. Read this before making any changes.

### How to orient yourself

1. Read `src/site-framework/index.js` first. It's the backend facade -- 45 lines that show you every export the framework provides.
2. Read `public/site-framework/js/index.js` next. It's the frontend facade -- 73 lines listing every UI component export.
3. Each subdirectory (`db/`, `routes/`, `js/notifications/`) has its own `index.js` aggregator. Start there, not at leaf files.

### Backend entry point: `src/site-framework/index.js`

```javascript
const framework = require('./site-framework');
```

This gives you:

| Export | Type | What it is | Key methods |
|--------|------|------------|-------------|
| `db` | Object | Full database module | `getDatabase()`, `DB_PATH`, `encryption` |
| `users` | Object | User CRUD | `getAll()`, `getById(id)`, `getByUsername(name)`, `create(name, pass, isAdmin)`, `update(id, updates)`, `delete(id)`, `verifyPassword(user, pass)`, `generateApiKey(id)`, `revokeApiKey(id)` |
| `sessions` | Object | JWT session tracking | `create(userId, tokenId, expiresAt)`, `isValid(tokenId)`, `revoke(tokenId)`, `revokeAllForUser(userId)`, `cleanup()` |
| `logs` | Object | Application logging | `add(level, message, userId?, metadata?)`, `getRecent(limit?, level?)`, `clearOld(days?)`, `clearAll()` |
| `settings` | Object | Key-value store | `get(key, default?)`, `set(key, value)`, `getAll()` |
| `auth` | Object | Auth middleware + handlers | `authenticate`, `requireAuth`, `requireAdmin`, `login`, `logout`, `getCurrentUser`, `refreshToken`, `getClientIP(req)` |
| `routes` | Router | Express router | Mount with `app.use('/api', framework.routes)` |

### Frontend entry point: `public/site-framework/js/index.js`

```javascript
import { auth, toast, SettingsModal, createUsersSection } from './site-framework/js/index.js';
```

| Export | What it is |
|--------|-----------|
| `Modal`, `ConfirmModal`, `getOpenModalCount` | Base modal system with z-index stacking, keyboard navigation, dirty-form detection |
| `SettingsModal` | Fullscreen modal with left sidebar for section navigation |
| `LogsModal` | Terminal-style log viewer with level filtering |
| `LoginModal` | Username/password login dialog |
| `AccountModal` | Self-service account settings (password change, API key management) |
| `UserModal` | Admin user create/edit dialog |
| `createUsersSection`, `refreshUsers` | User management table for embedding in SettingsModal |
| `createNotificationsSection` | Notification channel config UI for embedding in SettingsModal |
| `auth` | Auth manager: `login(user, pass)`, `logout()`, `isLoggedIn()`, `isAdmin()`, `fetch(url, opts)`, `getUser()`, `getToken()` |
| `toast` | Toast notifications: `info(msg)`, `success(msg)`, `warning(msg)`, `error(msg)`, `logout(callback, delay)` |
| `createField`, `validateField`, `validateForm`, `getFormValues`, `isFormDirty`, `setFieldError`, `clearFieldError`, `getFieldValue`, `setFieldValue` | IFTA-style form field creation and validation |
| `Table` | Sortable data table component |
| `CHANNEL_TYPES`, `getChannelConfig`, `getAllChannelTypes`, `isSensitiveField`, `NotificationChannelForm`, `NotificationAPI` | Notification channel configuration and API client |

### How to add a new protected API endpoint

```javascript
const { auth, logs } = require('./site-framework');

// Any authenticated user
app.get('/api/my-data', auth.requireAuth, (req, res) => {
  // req.user = { id, username, isAdmin, authMethod, tokenId }
  logs.add('info', 'Accessed my-data', req.user.id);
  res.json({ data: '...' });
});

// Admin only
app.delete('/api/my-data/:id', auth.requireAdmin, (req, res) => {
  // Only admins reach here
});
```

### How to add a new settings section

```javascript
import { SettingsModal, createUsersSection, createNotificationsSection } from './site-framework/js/index.js';

const settings = new SettingsModal({
  defaultSection: 'users',
  sections: [
    {
      id: 'general',
      label: 'General',
      icon: '<i class="sf-icon sf-icon-settings"></i>',
      content: '<p>Your settings here</p>'  // HTML string or function returning DOM element
    },
    { id: 'users', label: 'Users', icon: '<i class="sf-icon sf-icon-users"></i>', content: createUsersSection },
    { id: 'notifications', label: 'Notifications', icon: '<i class="sf-icon sf-icon-notifications"></i>', content: createNotificationsSection }
  ]
});
settings.open();
```

Section `content` can be an HTML string, a DOM element, or a function that returns either. Functions are called each time the section is selected.

### How to add a new notification channel

1. Add the channel definition to `public/site-framework/js/notifications/channels.js`:

```javascript
myChannel: {
  id: 'myChannel',
  name: 'My Channel',
  icon: '/icons/icon-mychannel.png',
  description: 'Send via my service',
  fields: [
    { id: 'apiKey', label: 'API Key', type: 'password', required: true, help: 'Your service API key' },
    { id: 'endpoint', label: 'Endpoint URL', type: 'text', required: true }
  ],
  sensitive: ['apiKey']
}
```

2. Add the sender function to `src/site-framework/routes/notifications.js`:

```javascript
async function sendMyChannel(config, message) {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  if (!response.ok) return { success: false, error: await response.text() };
  return { success: true };
}
```

3. Add the case to `sendTestNotification()` in the same file.

### Critical patterns to follow

- **All API calls from the frontend must use `auth.fetch()`**, not raw `fetch()`. This ensures the auth token is attached and 401 responses trigger auto-logout.
- **All database access goes through the DAO modules** (`users`, `sessions`, `logs`, `settings`, `notificationChannels`). Never call `getDatabase()` directly from route handlers.
- **Never store sensitive values in plaintext**. Use `encryption.encrypt()` / `encryption.decrypt()` from `db/encryption.js`.
- **Log security-relevant actions** (login, logout, API key generation, user changes) via `logs.add()` with the acting user's ID.

---

## Quick Start

### 1. Install dependencies

```bash
npm install express better-sqlite3 bcrypt jsonwebtoken cookie-parser dotenv
```

### 2. Copy the framework

Copy these directories into your project:
- `src/site-framework/` (backend)
- `public/site-framework/` (frontend CSS + JS)

### 3. Wire up the backend

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const framework = require('./site-framework');
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api', framework.routes);
```

### 4. Include the frontend

```html
<link rel="stylesheet" href="/site-framework/css/variables.css">
<link rel="stylesheet" href="/site-framework/css/components.css">
<link rel="stylesheet" href="/site-framework/css/modal.css">
<link rel="stylesheet" href="/site-framework/css/notifications.css">
```

```javascript
import { auth, toast, LoginModal, SettingsModal } from './site-framework/js/index.js';
```

### 5. Set environment variables

```bash
JWT_SECRET=your-secret-key        # Required for production
JWT_EXPIRY=24h                    # Token lifetime (default: 24h)
ENCRYPTION_KEY=your-32-char-key   # For encrypting sensitive fields
PORT=3000                         # Server port (default: 3000)
```

The database initializes itself on first run at `db/app.db` with a default admin user (`admin` / `admin`).

---

## Architecture

```
src/site-framework/
├── index.js                  # Backend entry point (facade)
├── auth.js                   # JWT + API key auth middleware & handlers
├── db/
│   ├── index.js              # DB module aggregator
│   ├── connection.js          # SQLite init, schema, migrations
│   ├── users.js              # User CRUD + password hashing
│   ├── sessions.js           # JWT session tracking
│   ├── logs.js               # Application log storage
│   ├── settings.js           # Key-value settings store
│   ├── notifications.js      # Notification channel CRUD + encryption
│   └── encryption.js         # AES-256-CBC utilities
└── routes/
    ├── index.js              # Router aggregator
    ├── auth.js               # POST login/logout/refresh, GET me
    ├── account.js            # Self-service account + API key
    ├── users.js              # Admin user CRUD
    ├── logs.js               # Admin log management
    ├── settings.js           # Admin settings
    └── notifications.js      # Channel config + test senders

public/site-framework/
├── css/
│   ├── variables.css         # Theme tokens (edit this to restyle everything)
│   ├── components.css        # Buttons, fields, tables, toasts, icons
│   ├── modal.css             # Modal system styles
│   └── notifications.css     # Notification channel form styles
└── js/
    ├── index.js              # Frontend entry point (facade)
    ├── auth.js               # Client-side auth manager
    ├── modal.js              # Base modal class
    ├── settings.js           # Settings modal with sidebar
    ├── logs.js               # Terminal-style log viewer
    ├── toast.js              # Toast notification system
    ├── table.js              # Sortable table component
    ├── field.js              # Form field utilities
    ├── menu.js               # Hamburger menu component
    ├── loginModal.js         # Login dialog
    ├── accountModal.js       # Account settings modal
    ├── userModal.js          # Admin user edit modal
    ├── usersSection.js       # Users management table
    ├── notificationsSection.js # Notification channels settings section
    └── notifications/
        ├── index.js          # Notification module exports & API client
        ├── channels.js       # Channel type definitions
        └── forms.js          # Channel configuration form component
```

---

## API Endpoints

All endpoints are prefixed with `/api`. Authentication is via `Authorization: Bearer <token>` header or `X-Api-Key: <key>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login with `{ username, password }`, returns `{ token, expiresAt, user }` |
| POST | `/api/auth/logout` | Token | Revoke current session |
| POST | `/api/auth/refresh` | Token | Get new token (revokes old) |
| GET | `/api/auth/me` | Token | Get current user info |

### Account (self-service)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/account` | Token | Get own account info |
| PUT | `/api/account` | Token | Update own username/password (`{ username?, currentPassword, newPassword }`) |
| POST | `/api/account/api-key` | Token | Generate/regenerate API key (returns plaintext once) |
| DELETE | `/api/account/api-key` | Token | Revoke own API key |

### Users (admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | Create user (`{ username, password, isAdmin }`) |
| GET | `/api/users/:id` | Admin | Get user by ID |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user (cannot delete self or last admin) |
| POST | `/api/users/:id/api-key` | Admin | Generate API key for user |

### Logs (admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/logs` | Admin | Get recent logs (`?limit=100&level=error`) |
| DELETE | `/api/logs` | Admin | Clear logs (`?all=true` or `?days=30`) |

### Settings (admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | Admin | Get all settings as `{ key: value }` |
| PUT | `/api/settings` | Admin | Update settings (`{ key: value, ... }`) |

### Notification Channels (admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications/channels` | Admin | Get all configured channels |
| GET | `/api/notifications/channels/:type` | Admin | Get specific channel config |
| PUT | `/api/notifications/channels/:type` | Admin | Save channel config |
| POST | `/api/notifications/channels/:type/test` | Admin | Send test notification |
| DELETE | `/api/notifications/channels/:type` | Admin | Delete channel config |

Supported channel types: `teams`, `slack`, `discord`, `email`, `webhook`

---

## Theming

Edit `public/site-framework/css/variables.css` to restyle everything. All framework components and consuming site pages reference these tokens.

```css
:root {
  --sf-primary: #22c55e;            /* Primary accent color */
  --sf-bg-body: #ffffff;            /* Page background */
  --sf-bg-panel: #ffffff;           /* Panel/modal background */
  --sf-text-primary: #111827;       /* Primary text */
  --sf-text-secondary: #6b7280;     /* Secondary text */
}
```

---

## Database

SQLite, auto-created at `db/app.db` on first run. The `db/` folder is gitignored.

**Default admin:** `admin` / `admin` -- change in production.

### Schema

```
users          (id, username, password_hash, api_key, api_key_last_four, api_key_created_at, is_admin, created_at, last_login)
sessions       (id, user_id, token_id, created_at, expires_at, revoked)
logs           (id, timestamp, level, message, user_id, metadata)
settings       (key, value, updated_at)
notification_channels (id, channel_type, enabled, config, created_at, updated_at)
```

`notification_channels.config` stores JSON with sensitive fields encrypted via AES-256-CBC.

---

## Security

| Mechanism | Details |
|-----------|---------|
| Password hashing | bcrypt, 12 rounds |
| Session tokens | JWT with configurable expiry, tracked in DB for revocation |
| API keys | SHA-256 hashed before storage, only last 4 chars stored for display |
| Sensitive data | AES-256-CBC encryption for notification channel secrets |
| Auth middleware | `authenticate` (passive), `requireAuth` (401), `requireAdmin` (403) |
| IP logging | Client IP logged on login, logout, and API key operations |
