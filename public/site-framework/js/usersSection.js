/**
 * Site Framework - Users Section
 * ============================================
 *
 * Users management section for settings modal.
 * Includes user table with add/edit/delete.
 *
 * USAGE:
 *   import { createUsersSection } from './site-framework/js/usersSection.js';
 *
 *   const settingsModal = new SettingsModal({
 *     sections: [
 *       { id: 'users', label: 'Users', icon: '...', content: createUsersSection }
 *     ]
 *   });
 */

import { Table } from './table.js';
import { UserModal } from './userModal.js';
import { ConfirmModal } from './modal.js';
import { auth } from './auth.js';
import { toast } from './toast.js';

let usersTable = null;
let users = [];

/**
 * Create the users section content
 * @returns {HTMLElement}
 */
export function createUsersSection() {
  const container = document.createElement('div');
  container.className = 'sf-users-section';

  container.innerHTML = `
    <div class="sf-users-toolbar" style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
      <button class="sf-btn sf-btn-primary" id="add-user-btn">
        <i class="sf-icon sf-icon-add"></i> Add User
      </button>
    </div>
    <div id="users-table-container"></div>
  `;

  // Initialize table
  const tableContainer = container.querySelector('#users-table-container');
  usersTable = new Table({
    container: tableContainer,
    columns: [
      { id: 'username', label: 'Username', sortable: true },
      { id: 'role', label: 'Role', sortable: true, render: (row) => row.is_admin ? 'Admin' : 'User' },
      { id: 'last_login', label: 'Last Login', sortable: true, type: 'date', render: (row) => {
        if (!row.last_login) return 'Never';
        return new Date(row.last_login).toLocaleString();
      }},
      { id: 'actions', label: '', render: (row) => `
        <div class="sf-table-actions">
          <button class="sf-btn sf-btn-icon sf-btn-secondary" data-action="edit" data-id="${row.id}" title="Edit">
            <i class="sf-icon sf-icon-edit"></i>
          </button>
          <button class="sf-btn sf-btn-icon sf-btn-danger" data-action="delete" data-id="${row.id}" title="Delete">
            <i class="sf-icon sf-icon-delete"></i>
          </button>
        </div>
      `}
    ],
    data: [],
    defaultSort: 'username'
  });

  // Bind add button
  container.querySelector('#add-user-btn').addEventListener('click', () => {
    openAddUserModal();
  });

  // Bind table action buttons (using event delegation)
  tableContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const userId = parseInt(btn.dataset.id);
    const user = users.find(u => u.id === userId);

    if (!user) return;

    if (action === 'edit') {
      openEditUserModal(user);
    } else if (action === 'delete') {
      openDeleteUserConfirm(user);
    }
  });

  // Load users
  loadUsers();

  return container;
}

/**
 * Load users from API
 */
async function loadUsers() {
  try {
    const res = await auth.fetch('/api/users');
    if (!res.ok) throw new Error('Failed to load users');

    users = await res.json();
    usersTable.setData(users);
  } catch (err) {
    console.error('Failed to load users:', err);
    toast.error('Failed to load users');
  }
}

/**
 * Open add user modal
 */
function openAddUserModal() {
  const modal = new UserModal({
    onSave: () => {
      loadUsers();
    }
  });
  modal.open();
}

/**
 * Open edit user modal
 */
function openEditUserModal(user) {
  const modal = new UserModal({
    user,
    onSave: () => {
      loadUsers();
    }
  });
  modal.open();
}

/**
 * Open delete confirmation
 */
function openDeleteUserConfirm(user) {
  // Check if trying to delete self
  const currentUser = auth.getUser();
  if (currentUser && currentUser.id === user.id) {
    toast.error('Cannot delete yourself');
    return;
  }

  const confirm = new ConfirmModal({
    title: 'Delete User',
    message: `Are you sure you want to delete "${user.username}"?`,
    confirmText: 'Delete',
    confirmStyle: 'danger',
    onConfirm: async () => {
      try {
        const res = await auth.fetch(`/api/users/${user.id}`, {
          method: 'DELETE'
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete user');
        }

        confirm.close();
        toast.success('User deleted');
        loadUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        confirm.close();
        toast.error(err.message);
      }
    }
  });
  confirm.open();
}

/**
 * Refresh the users table
 */
export function refreshUsers() {
  loadUsers();
}

export default { createUsersSection, refreshUsers };
