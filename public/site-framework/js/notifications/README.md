# Notification Channels Module

Configurable notification system supporting Teams, Slack, Discord, Email (SMTP), and generic webhooks.

## For agents: how this module works

This module has three layers. Read them in this order:

1. **`channels.js`** -- Static configuration. Defines `CHANNEL_TYPES` object where each key is a channel ID (`teams`, `slack`, etc.) with its form fields, validation rules, and sensitive field markers. To add a new channel type, add an entry here.

2. **`forms.js`** -- UI rendering. `NotificationChannelForm` reads a channel's field definitions from `channels.js` and generates the form DOM, handles conditional field visibility (`showWhen`), masks sensitive fields, and wires up save/test callbacks.

3. **`index.js`** -- API client + re-exports. `NotificationAPI` provides `getAll()`, `get(type)`, `save(type, config)`, `test(type, config)`, `delete(type)`. All calls go through `auth.fetch()` so auth tokens are attached automatically.

The consuming code never touches these files directly. It imports `createNotificationsSection` from `../notificationsSection.js` which wires everything together into a settings panel section.

## Backend counterpart

The server-side routes live at `src/site-framework/routes/notifications.js`. That file handles channel CRUD and contains the sender functions (`sendTeams`, `sendSlack`, etc.) for test notifications. When adding a new channel type, you must add both the frontend definition in `channels.js` AND the sender function in `routes/notifications.js`.

## Sensitive field encryption

Fields listed in a channel's `sensitive` array are encrypted with AES-256-CBC before storage and masked as `••••••••` in API responses. The encryption logic lives in `src/site-framework/db/encryption.js`. Set the `ENCRYPTION_KEY` env var in production.
