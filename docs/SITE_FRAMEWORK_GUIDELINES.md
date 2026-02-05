# Site Framework -- Design Guidelines

You are implementing a **modular, reusable site framework**. This framework is the foundational layer for any web project. Everything you build here must be portable: a developer should be able to copy the `src/site-framework/` and `public/site-framework/` folders into a new project and have authentication, settings, logging, and UI primitives working with minimal configuration.

**Tech stack:** Node.js + Express backend, SQLite database (better-sqlite3), vanilla JS frontend (no frameworks), CSS custom properties for theming.

---

## 1. Architecture

### File organization

Backend modules live in `src/site-framework/` with two subdirectories:
- `db/` -- One file per database domain (users, sessions, logs, settings, notifications, encryption). Each file imports `getDatabase()` from `db/connection.js`.
- `routes/` -- One file per API domain (auth, account, users, logs, settings, notifications). Each file exports an Express router.

Both directories have an `index.js` aggregator that re-exports everything. The top-level `src/site-framework/index.js` is the single entry point consumers use.

Frontend modules live in `public/site-framework/js/` with one file per UI component. The `notifications/` subdirectory contains the notification channel subsystem. `public/site-framework/js/index.js` is the single import consumers use.

### Key constraint: file size

Keep individual files under 200 lines. If a file grows beyond that, split it into focused sub-modules. The goal is that a consumer modifying one feature (e.g., how user creation works) only needs to read and edit one small file.

### Entry points

Every `index.js` aggregator must have a JSDoc comment block listing all exports with their types and key methods. This serves as the API contract for consumers.

---

## 2. Theming

All visual tokens (colors, spacing, border radii, shadows, fonts) are defined as CSS custom properties in `public/site-framework/css/variables.css`. Every framework component references these tokens. Never hardcode colors or spacing values. Changing the site's identity should require editing only `variables.css`.

### CSS files

| File | Purpose |
|------|---------|
| `variables.css` | Design tokens shared between framework and consuming site |
| `components.css` | Buttons, fields, tables, toasts, icons |
| `modal.css` | Modal and popup system |
| `notifications.css` | Notification channel form styles |

---

## 3. Database

Use SQLite via better-sqlite3. Schema and migrations live in `db/connection.js`. The database self-initializes on first run.

Rules:
- Schema initialization must be idempotent
- Migrations check for missing columns/tables before altering
- `db/` folder is gitignored -- databases are per-deployment
- Hash passwords with bcrypt (12 rounds)
- Hash API keys with SHA-256
- Encrypt sensitive notification config fields with AES-256-CBC

---

## 4. Authentication

### JWT sessions
- Issue JWT on login with user ID, username, admin flag, and a unique `jti`
- Track sessions in the `sessions` table for revocation support
- Support both `Authorization: Bearer` header and cookie-based auth
- Three middleware levels: `authenticate` (passive attach), `requireAuth` (401 if missing), `requireAdmin` (403 if not admin)

### API keys
- Stored as SHA-256 hash, never plaintext
- Last 4 characters stored separately for display
- Auth via `X-Api-Key` header, checked before JWT in the middleware chain

---

## 5. Modal System

One base `Modal` class that all modals inherit from. Never fork or duplicate modal code.

### Rules
- Z-index manager: each new modal gets a higher z-index than the current topmost
- Close via red X button, backdrop click, or Escape key
- Backdrop click and Escape check for dirty forms before closing (show ConfirmModal if dirty)
- Tab cycles through interactive elements within the modal
- Enter triggers the primary action
- Animation timing: 250ms

---

## 6. Form Fields

Use IFTA (Infield Top-Aligned) labels for all form fields. The `createField()` utility in `field.js` generates the correct markup.

### Rules
- Required fields marked with red asterisk
- Validation on blur, error message displayed below field
- Help text via `(i)` icon with hover tooltip -- use sparingly
- Disable browser autofill on all fields except the login form
- Password manager attributes on non-login fields to prevent unwanted autofill

---

## 7. Buttons

- Align button groups to the right
- Left button = positive action (Save, Submit) -- primary color, prominent
- Right button = negative action (Cancel, Close) -- subtle, muted
- Loading states change button text (e.g., "Saving...")

---

## 8. Frontend API Calls

All authenticated API calls from the frontend must go through `auth.fetch()` (defined in `js/auth.js`). This wrapper:
- Attaches the `Authorization: Bearer` header automatically
- Sets `Content-Type: application/json`
- Handles 401 responses by triggering logout

Never use raw `fetch()` with manual `localStorage.getItem('sf_auth_token')` calls.

---

## 9. Logging

Log security-relevant actions via `logs.add(level, message, userId, metadata)`:
- Login attempts (success and failure, with client IP)
- Logout
- API key generation, regeneration, revocation (with client IP)
- User creation, modification, deletion
- Settings changes
- Notification channel changes

Timestamps are stored in Central Time (America/Chicago) via `getCentralTime()` in `db/logs.js`.
