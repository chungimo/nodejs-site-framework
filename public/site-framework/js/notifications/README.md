# Site Framework - Notification Channels

This module provides a complete notification channel configuration system for the site framework.

## Supported Channels

- **Microsoft Teams** - Incoming Webhook integration
- **Email (SMTP)** - SMTP relay for email notifications
- **Slack** - Incoming Webhook integration
- **Discord** - Webhook integration
- **Generic Webhook** - Custom webhook endpoints with authentication

## Usage

### Adding Notifications Section to SettingsModal

```javascript
import {
  SettingsModal,
  getAllChannelTypes,
  NotificationChannelForm,
  NotificationAPI,
  toast
} from './site-framework/js/index.js';

// Create the notifications section content
function createNotificationsSection() {
  const container = document.createElement('div');
  container.className = 'sf-notify-channels';

  const channelTypes = getAllChannelTypes();

  channelTypes.forEach(async (channelConfig) => {
    const channelContainer = document.createElement('div');
    container.appendChild(channelContainer);

    // Fetch existing config
    let initialValues = {};
    try {
      const saved = await NotificationAPI.get(channelConfig.id);
      if (saved) {
        initialValues = { enabled: saved.enabled, ...saved.config };
      }
    } catch (err) {
      console.error(`Failed to load ${channelConfig.id} config:`, err);
    }

    // Create the form
    new NotificationChannelForm({
      channelType: channelConfig.id,
      container: channelContainer,
      initialValues,
      onSave: async (values) => {
        try {
          await NotificationAPI.save(channelConfig.id, values);
          toast.success(`${channelConfig.name} configuration saved`);
        } catch (err) {
          toast.error(`Failed to save: ${err.message}`);
        }
      },
      onTest: async (values) => {
        try {
          await NotificationAPI.test(channelConfig.id, values);
          toast.success('Test notification sent!');
        } catch (err) {
          toast.error(`Test failed: ${err.message}`);
        }
      },
      onToggle: (enabled) => {
        console.log(`${channelConfig.name} ${enabled ? 'enabled' : 'disabled'}`);
      }
    });
  });

  return container;
}

// Create settings modal with notifications section
const settingsModal = new SettingsModal({
  sections: [
    {
      id: 'general',
      label: 'General',
      icon: '⚙️',
      content: '<p>General settings go here...</p>'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      content: createNotificationsSection
    },
    {
      id: 'users',
      label: 'Users',
      icon: '👥',
      content: '...' // User management
    }
  ]
});

// Open settings
settingsModal.open();
```

### Importing the CSS

Add this to your HTML or main CSS file:

```html
<link rel="stylesheet" href="/site-framework/css/notifications.css">
```

Or import in your main CSS:

```css
@import url('/site-framework/css/notifications.css');
```

## API Endpoints

All endpoints require admin authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/channels` | Get all channel configs |
| GET | `/api/notifications/channels/:type` | Get specific channel |
| PUT | `/api/notifications/channels/:type` | Save channel config |
| POST | `/api/notifications/channels/:type/test` | Test channel |
| DELETE | `/api/notifications/channels/:type` | Delete channel |

## Security

- Sensitive fields (webhookUrl, passwords, tokens) are encrypted at rest
- Sensitive fields are masked in API responses (shown as `••••••••`)
- Only new values are encrypted; empty fields preserve existing values
- Uses AES-256-CBC encryption

## Environment Variables

Set `ENCRYPTION_KEY` for production deployments:

```bash
ENCRYPTION_KEY=your-32-character-secret-key-here
```

## Adding Custom Channel Types

Edit `channels.js` to add new channel types:

```javascript
export const CHANNEL_TYPES = {
  // ... existing channels

  myCustomChannel: {
    id: 'myCustomChannel',
    name: 'My Custom Channel',
    icon: '🚀',
    description: 'Description of the channel',
    fields: [
      {
        id: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        help: 'Your API key from the service'
      }
    ],
    sensitive: ['apiKey']
  }
};
```

Then implement the sending logic in `routes.js`:

```javascript
async function sendMyCustomNotification(config, message) {
  // Implementation
}
```
