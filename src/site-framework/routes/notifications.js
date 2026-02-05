/**
 * Notification Channel Routes (Admin only)
 * ============================================
 *
 * ENDPOINTS:
 *   GET    /notifications/channels            - Get all channels
 *   GET    /notifications/channels/:type      - Get channel config
 *   PUT    /notifications/channels/:type      - Save channel config
 *   POST   /notifications/channels/:type/test - Test channel
 *   DELETE /notifications/channels/:type      - Delete channel
 */

const express = require('express');
const router = express.Router();
const auth = require('../auth');
const { logs, notificationChannels } = require('../db');

// ============================================
// Channel CRUD
// ============================================

router.get('/channels', auth.requireAdmin, (req, res) => {
  try {
    const channels = notificationChannels.getAll();
    res.json(channels);
  } catch (err) {
    console.error('Error getting notification channels:', err);
    res.status(500).json({ error: 'Failed to get notification channels' });
  }
});

router.get('/channels/:type', auth.requireAdmin, (req, res) => {
  try {
    const channel = notificationChannels.get(req.params.type);
    if (!channel) {
      return res.json({ channelType: req.params.type, enabled: false, config: {} });
    }
    res.json(channel);
  } catch (err) {
    console.error('Error getting notification channel:', err);
    res.status(500).json({ error: 'Failed to get notification channel' });
  }
});

router.put('/channels/:type', auth.requireAdmin, (req, res) => {
  const { enabled, ...config } = req.body;

  try {
    notificationChannels.save(req.params.type, enabled, config);
    logs.add('info', `Notification channel updated: ${req.params.type}`, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving notification channel:', err);
    res.status(500).json({ error: 'Failed to save notification channel' });
  }
});

router.delete('/channels/:type', auth.requireAdmin, (req, res) => {
  try {
    notificationChannels.delete(req.params.type);
    logs.add('info', `Notification channel deleted: ${req.params.type}`, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting notification channel:', err);
    res.status(500).json({ error: 'Failed to delete notification channel' });
  }
});

// ============================================
// Test Notifications
// ============================================

router.post('/channels/:type/test', auth.requireAdmin, async (req, res) => {
  const channelType = req.params.type;

  try {
    let config = notificationChannels.getDecrypted(channelType);

    if (req.body && Object.keys(req.body).length > 0) {
      const { enabled, ...testConfig } = req.body;
      config = config ? { ...config.config, ...testConfig } : testConfig;
    } else if (config) {
      config = config.config;
    }

    if (!config) {
      return res.status(400).json({ error: 'Channel not configured' });
    }

    const result = await sendTestNotification(channelType, config);

    if (result.success) {
      logs.add('info', `Test notification sent: ${channelType}`, req.user.id);
      res.json({ success: true, message: 'Test notification sent successfully' });
    } else {
      res.status(400).json({ error: result.error || 'Test failed' });
    }
  } catch (err) {
    console.error('Error testing notification channel:', err);
    res.status(500).json({ error: err.message || 'Failed to test notification channel' });
  }
});

// ============================================
// Notification Senders
// ============================================

async function sendTestNotification(channelType, config) {
  const testMessage = {
    title: 'Test Notification',
    text: 'This is a test notification from the site framework.',
    timestamp: new Date().toISOString()
  };

  switch (channelType) {
    case 'teams':    return await sendTeams(config, testMessage);
    case 'slack':    return await sendSlack(config, testMessage);
    case 'discord':  return await sendDiscord(config, testMessage);
    case 'email':    return await sendEmail(config, testMessage);
    case 'webhook':  return await sendWebhook(config, testMessage);
    default:         return { success: false, error: 'Unknown channel type' };
  }
}

async function sendTeams(config, message) {
  if (!config.webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: message.title,
      themeColor: '4ecca3',
      title: message.title,
      text: message.text
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) return { success: true };
    const text = await response.text();
    return { success: false, error: `Teams API error: ${text}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function sendSlack(config, message) {
  if (!config.webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const payload = { text: `*${message.title}*\n${message.text}` };
    if (config.channel) payload.channel = config.channel;
    if (config.username) payload.username = config.username;

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) return { success: true };
    const text = await response.text();
    return { success: false, error: `Slack API error: ${text}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function sendDiscord(config, message) {
  if (!config.webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const payload = {
      embeds: [{
        title: message.title,
        description: message.text,
        color: 0x4ecca3,
        timestamp: message.timestamp
      }]
    };

    if (config.username) payload.username = config.username;
    if (config.avatarUrl) payload.avatar_url = config.avatarUrl;

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 204) return { success: true };
    const text = await response.text();
    return { success: false, error: `Discord API error: ${text}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function sendEmail(config, message) {
  try {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: config.smtpServer,
      port: parseInt(config.smtpPort) || 587,
      secure: config.smtpPort === '465',
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword
      },
      tls: {
        rejectUnauthorized: config.useTls !== false
      }
    });

    const recipients = config.toAddresses.split(',').map(e => e.trim()).join(', ');

    await transporter.sendMail({
      from: config.fromAddress,
      to: recipients,
      subject: message.title,
      text: message.text
    });

    return { success: true };
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return { success: false, error: 'nodemailer not installed. Run: npm install nodemailer' };
    }
    return { success: false, error: err.message };
  }
}

async function sendWebhook(config, message) {
  if (!config.webhookUrl) {
    return { success: false, error: 'Webhook URL not configured' };
  }

  try {
    const headers = { 'Content-Type': 'application/json' };

    if (config.authType === 'bearer' && config.authValue) {
      headers['Authorization'] = `Bearer ${config.authValue}`;
    } else if (config.authType === 'apikey' && config.authValue) {
      headers['X-Api-Key'] = config.authValue;
    } else if (config.authType === 'basic' && config.authValue) {
      headers['Authorization'] = `Basic ${Buffer.from(config.authValue).toString('base64')}`;
    }

    if (config.customHeaders) {
      try {
        const customHeaders = JSON.parse(config.customHeaders);
        Object.assign(headers, customHeaders);
      } catch {
        // Invalid JSON, ignore custom headers
      }
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(message)
    });

    if (response.ok) return { success: true };
    const text = await response.text();
    return { success: false, error: `Webhook error: ${response.status} ${text}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = router;
