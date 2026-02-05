import { Menu } from './site-framework/js/menu.js';
import { auth } from './site-framework/js/auth.js';
import { toast } from './site-framework/js/toast.js';
import { Modal } from './site-framework/js/modal.js';
import { LoginModal } from './site-framework/js/loginModal.js';
import { AccountModal } from './site-framework/js/accountModal.js';
import { SettingsModal } from './site-framework/js/settings.js';
import { LogsModal } from './site-framework/js/logs.js';
import { createUsersSection } from './site-framework/js/usersSection.js';
import { getAllChannelTypes, NotificationChannelForm, NotificationAPI } from './site-framework/js/notifications/index.js';

// Check API status
async function checkStatus() {
    const statusText = document.getElementById('status-text');
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        statusText.textContent = data.status === 'ok' ? 'Server Running' : 'Server Error';
    } catch (err) {
        statusText.textContent = 'Server Offline';
    }
}
checkStatus();

// Initialize menu
const menu = new Menu({
    containerId: 'menu-container',
    isLoggedIn: auth.isLoggedIn(),
    onItemClick: handleMenuClick
});
menu.create();

// Username display element
const usernameEl = document.getElementById('header-username');

// Update username display
function updateUsernameDisplay(isLoggedIn, user) {
    if (isLoggedIn && user) {
        usernameEl.textContent = user.username;
        usernameEl.classList.add('visible');
    } else {
        usernameEl.textContent = '';
        usernameEl.classList.remove('visible');
    }
}

// Set initial username display
if (auth.isLoggedIn()) {
    updateUsernameDisplay(true, auth.getUser());
}

// Handle auth state changes
auth.setOnAuthChange((isLoggedIn, user) => {
    menu.setLoggedIn(isLoggedIn);
    updateUsernameDisplay(isLoggedIn, user);
    if (isLoggedIn) {
        toast.success(`Welcome, ${user.username}!`);
    }
});

// Menu click handler
function handleMenuClick(itemId) {
    switch (itemId) {
        case 'account':
            if (auth.isLoggedIn()) {
                showAccountModal();
            } else {
                showLoginModal();
            }
            break;

        case 'settings':
            showSettingsModal();
            break;

        case 'logs':
            showLogsModal();
            break;

        case 'logout':
            handleLogout();
            break;
    }
}

// Show login modal
function showLoginModal() {
    const modal = new LoginModal({
        onLoginSuccess: (user) => {
            // Menu updates via auth.onAuthChange
        }
    });
    modal.open();
}

// Show account modal
function showAccountModal() {
    const modal = new AccountModal();
    modal.open();
}

// Create notifications section content
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
            // Channel not configured yet, use defaults
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
                // Toggle is saved when form is saved
            }
        });
    });

    return container;
}

// Show settings modal
function showSettingsModal() {
    if (!auth.isAdmin()) {
        toast.warning('Admin access required');
        return;
    }

    const modal = new SettingsModal({
        defaultSection: 'users',
        sections: [
            {
                id: 'general',
                label: 'General',
                icon: '<i class="sf-icon sf-icon-settings"></i>',
                content: '<p style="color: var(--sf-text-muted);">General settings coming soon...</p>'
            },
            {
                id: 'users',
                label: 'Users',
                icon: '<i class="sf-icon sf-icon-users"></i>',
                content: createUsersSection
            },
            {
                id: 'notifications',
                label: 'Notifications',
                icon: '<i class="sf-icon sf-icon-notifications"></i>',
                content: createNotificationsSection
            }
        ]
    });
    modal.open();
}

// Show logs modal
async function showLogsModal() {
    if (!auth.isAdmin()) {
        toast.warning('Admin access required');
        return;
    }

    // Fetch logs from server
    let entries = [];
    try {
        const res = await auth.fetch('/api/logs?limit=100');
        if (res.ok) {
            entries = await res.json();
        }
    } catch (err) {
        console.error('Failed to fetch logs:', err);
    }

    const modal = new LogsModal({
        entries: entries.map(e => ({
            timestamp: e.timestamp,
            level: e.level,
            message: e.message
        }))
    });
    modal.open();
}

// Handle logout
function handleLogout() {
    toast.logout(() => {
        auth.logout();
        window.location.reload();
    });
}
