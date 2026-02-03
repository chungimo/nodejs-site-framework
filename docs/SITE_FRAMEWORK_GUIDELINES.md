# Site Framework — Agent Implementation Guidelines

You are implementing a **modular, reusable site framework**. This framework is the foundational layer for any web project. Everything you build here must be portable: a developer should be able to copy the framework folder into a new project and have authentication, settings, logging, and UI primitives working with minimal configuration.

**Tech stack:** Node.js backend, SQLite database, vanilla JS frontend (no frontend frameworks). Styling via CSS with a centralized theme system.

---

## 1. Architecture & Portability

### Folder Structure

The framework lives in its own directory (e.g., `site-framework/`) with clear separation from site-specific code. The consuming site imports what it needs.


### Theme System

All colors, fonts, border radii, spacing values, and shadows must be defined as CSS custom properties in a single `variables.css` file. Every framework component and the consuming site reference these tokens — never hardcode colors or spacing. Changing the site's visual identity should require editing only `variables.css`.

### CSS Organization

- `variables.css` — Design tokens (shared between framework and site)
- `components.css` — Framework component styles (buttons, fields, tables, toasts, icons)
- `modal.css` — Modal and popup system styles
- `notifications.css` — Notification channel form styles
- Site-specific CSS files import/reference the theme but live outside the framework folder

Add a comment block at the top of any shared CSS file: `/* Site Framework — shared foundation styles */`

---

## 2. Database

Use SQLite. The database file lives in a `db/` folder within the project root.

**On application startup, always:**

1. Check if the database file exists.
2. If it does not exist, create the `db/` directory, initialize the database, and run the full schema creation.
3. Ensure `.gitignore` includes `db/` so credentials and data are never committed.

The schema must include at minimum: a `users` table (id, username, password_hash, api_token, role, created_at, last_login).

Design the initialization so it is idempotent — running it against an existing database should not error or duplicate data.

---

## 3. Authentication

### Passwords

Hash all passwords with **bcrypt** before storing. Never store plaintext. Use a work factor of at least 10.

### JWT Sessions

- Issue a JWT on successful login containing the user ID and role.
- Store the JWT in an `httpOnly` cookie (preferred) or provide it for `Authorization: Bearer` header use.
- Implement token expiration (reasonable default: 24 hours).
- Create Express middleware (or equivalent) that verifies the JWT on protected routes and attaches the decoded user to the request object.

### API Tokens

- Each user has an API token field.
- Provide a "Generate" action that creates a cryptographically random token and stores its hash (not plaintext) in the database.
- API token auth middleware should check the `Authorization` header and validate against stored hashes.

### Role-Based Access

Support at minimum two roles: `user` and `admin`. Implement middleware that checks the user's role before granting access to restricted routes or returning restricted data.

**Leave clear comments** at every access-controlled endpoint and UI element:
```js
// RESTRICTED: admin only — see auth/middleware.js#requireRole
```

Document the pattern for adding new restricted pages/routes/UI elements in the README so future developers can follow it consistently.

---

## 4. Login & Logout

### Login

The login UI is a popup (see Popup System below). Support two integration modes — document both in the README:

1. **Gate mode:** The login popup appears on load and blocks all interaction until authenticated. The site content is not rendered or accessible until a valid session exists.
2. **Optional mode:** The site is viewable anonymously. A login button in the nav or header opens the login popup. Authenticated users gain access to additional features, settings, and restricted content.

The current project uses **optional mode**.

### Logout

When the user logs out:

1. Clear the session (delete the JWT cookie / remove the token from storage).
2. Display a dismissal notification popup (not the standard popup — use a small toast/banner style) that says "Logging out..." with a 3-second animated countdown or progress indicator.
3. After the delay, force a full page reload (`window.location.reload()`).

---

## 5. Popup System

Build a single reusable popup class that all popups inherit from. Every popup in the framework and consuming site should use this system. Custom styling for a specific popup should override the base class — never fork or duplicate the popup code.

### Z-Ordering

Maintain a z-index manager. Each new popup that opens gets a z-index higher than the current topmost popup. Nested popups (e.g., a confirmation dialog over a settings panel) must always appear on top.

### Close Behavior

- Every popup has a **red ✕ button** in the top right corner.
- Clicking the backdrop (outside the popup) closes it — **unless** the popup contains form fields that have been modified. In that case, show a styled confirmation dialog asking whether to save or discard changes before closing.
- `Escape` key closes the topmost popup (with the same dirty-field check).

### Keyboard Navigation

- `Tab` cycles through interactive elements (fields, checkboxes, radio buttons, buttons) in top-to-bottom, left-to-right order.
- `Enter` submits / triggers the primary action.
- `Escape` closes the popup (with dirty-field check).

### Backdrop

Use a blurred backdrop overlay behind the popup. The blur and overlay color should be defined in `theme.css`.

---

## 6. Form Fields

Use **IFTA (Infield Top-Aligned) label** style for all form fields. The field has a visible border/outline, and the label sits on the top-left edge of the border.

### Validation States

- **Default:** Neutral border color (from theme).
- **Invalid:** Border color changes (e.g., red from theme) when validation fails. Examples: empty required field, letters in a phone number field, password too short.
- **Valid/focused:** Optional accent border color on focus.

### Required Fields

Mark required fields with a red `*` next to the label.

### Help Text

- Most fields (Name, Email, Password) need no additional help — the label is self-explanatory.
- For complex fields where the expected input format may be ambiguous, add an `(i)` icon next to the label. On hover, display a tooltip with field help text.
- Only use inline placeholder/helper text inside the field for cases like password creation ("At least 6 characters"). Never use it for obvious fields.
- **Use help text sparingly.** If a field needs extensive explanation, the UX design should be reconsidered.

### Autofill

Disable browser autofill on all fields **except** the login form. Use `autocomplete="off"` and, where browsers ignore it, use `autocomplete="new-password"` or dynamically-named fields.

Ensure fields (other than login) doesn't trigger password managers either.

---

## 7. Buttons

### Alignment & Order

- Align button groups to the **right** side of their container.
- **Left button = positive action** (Submit, Save, OK, Accept) — styled with the primary/accent color, visually prominent.
- **Right button = negative action** (Cancel, Close, Discard) — styled subtly, muted/text-only, blends into the background. The goal is to draw the user's eye to the positive action by default.

This order is the default. In rare cases where the destructive action is actually preferable (e.g., "Delete this?" where Delete is correct), the styling emphasis may be inverted — but document these exceptions clearly.

---

## 8. Settings Panel

The settings panel is a **near-fullscreen popup** using the same backdrop blur as other popups.

### Layout

- **Left sidebar:** Category navigation list with a vertical divider separating it from the content area.
- **Right content area:** Displays the content for the selected category.
- Clicking a category in the sidebar highlights it (accent color from theme) and slide-animates the content transition.

### Categories

#### 8.1 Site Settings

Placeholder section. Leave a clearly commented stub with instructions for adding site-specific settings:

```js
// SITE SETTINGS: Add project-specific configuration options here.
// Each setting should use the standard field components from framework/ui/fields.
// Follow the pattern in User Accounts for table-based settings.
```

#### 8.2 User Accounts

Display a **sortable table** with columns: Username, Last Login, Edit (button), Delete (button).

- Columns are sortable: alphabetical (A→Z / Z→A) for text, chronological (newest/oldest) for timestamps.
- **Standardize this sortable table component** — it will be reused across other settings categories and site pages. Build it as a generic, configurable component.
- Clicking a table row opens the **Edit User** popup (same fields as Add User, pre-filled with current values).
- An **"Add User"** button above the table opens the Add User popup with fields: Name, Password, API Token (with a Generate button), Admin (checkbox).

#### 8.3 Integrations

##### Notifications

The framework includes a complete notification channel configuration system. Supported channels:

- **Microsoft Teams** — Incoming Webhook integration
- **Slack** — Incoming Webhook with optional channel/username override
- **Discord** — Webhook with custom bot name and avatar support
- **Email (SMTP)** — Full SMTP configuration with TLS support
- **Generic Webhook** — Custom endpoints with authentication (Bearer, API Key, Basic Auth)

Each channel provides:
- Enable/disable toggle
- Configuration form with validation
- Test notification button
- Secure storage (sensitive fields like passwords are encrypted with AES-256-CBC)

The notification UI is rendered via `createNotificationsSection()` from `js/index.js`. Channel types are defined in `js/notifications/channels.js` and can be extended by adding new entries to `CHANNEL_TYPES`.

##### Webhooks

The Generic Webhook channel type supports custom webhook endpoints with configurable authentication. For project-specific webhook integrations, add new channel types to `CHANNEL_TYPES` in `js/notifications/channels.js`.

---

## 9. Logs Viewer

Build a **terminal-style log viewer** component.

- Displays log entries sorted by timestamp (newest first by default, toggleable).
- Styled to look like a terminal: monospace font, dark background, scrollable.
- Designed to accept log entries from multiple sources: console output, custom application events (user logins, configuration changes, CRUD operations), and any other event the consuming site wants to log.
- The log storage and retrieval mechanism should be simple — a SQLite `logs` table with timestamp, level, source, and message columns is sufficient.

---

## 10. Documentation

Write a `README.md` inside the framework folder. The README is a **technical implementation guide**, not a marketing document. No badges, no feature showcases. Write it for a developer who just cloned the repo and needs to integrate the framework into their project.

**Required sections:**

1. **Quick Start** — How to include the framework in a new project. File copies, npm installs, initialization steps.
2. **Configuration** — What to change in `theme.css` for branding. Where environment variables or config files live (JWT secret, DB path, etc.).
3. **Entry Points** — Which files to import/include and in what order. How to mount the auth middleware. How to initialize the database.
4. **Adding Restricted Resources** — Step-by-step pattern for protecting a new route, page, or UI element behind role-based auth.
5. **Adding Settings Categories** — How to add a new section to the settings panel.
6. **Adding Notification Triggers** — How to wire a new event into the notification system.
7. **Component Reference** — Brief description of each reusable UI component (popup, fields, sortable table, buttons, toast notifications) with usage examples.
8. **Common Customization Points** — A quick-reference list of the files and variables to change for the most frequent customizations (colors, logo, session duration, etc.).

---

## Summary of Principles

- **Portable:** The framework folder is self-contained and can be dropped into any Node.js project.
- **Themeable:** One file (`variables.css`) controls the entire visual identity.
- **DRY:** One popup class, one field system, one table component. Overrides for special cases, never copies.
- **Secure by default:** Bcrypt, JWT, httpOnly cookies, role middleware, encrypted sensitive fields.
- **Self-initializing:** The database creates itself on first run. No manual setup steps beyond `npm install`.
- **Documented for implementation:** The README tells you how to use it, not how cool it is.
