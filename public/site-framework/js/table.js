/**
 * Site Framework - Sortable Table Component
 * ============================================
 *
 * USAGE:
 *   import { Table } from './site-framework/js/table.js';
 *
 *   const table = new Table({
 *     container: document.getElementById('my-table'),
 *     columns: [
 *       { id: 'name', label: 'Name', sortable: true },
 *       { id: 'email', label: 'Email', sortable: true },
 *       { id: 'actions', label: '', render: (row) => '<button>Edit</button>' }
 *     ],
 *     data: [
 *       { id: 1, name: 'John', email: 'john@example.com' },
 *       { id: 2, name: 'Jane', email: 'jane@example.com' }
 *     ],
 *     onRowClick: (row) => console.log('Clicked:', row)
 *   });
 */

export class Table {
  constructor(options = {}) {
    this.container = options.container;
    this.columns = options.columns || [];
    this.data = options.data || [];
    this.sortColumn = options.defaultSort || null;
    this.sortDirection = options.defaultSortDir || 'asc';
    this.onRowClick = options.onRowClick || null;
    this.onSort = options.onSort || null;

    if (this.container) {
      this.render();
    }
  }

  /**
   * Set table data and re-render
   */
  setData(data) {
    this.data = data;
    this.render();
  }

  /**
   * Add a row
   */
  addRow(row) {
    this.data.push(row);
    this.render();
  }

  /**
   * Remove a row by id
   */
  removeRow(id) {
    this.data = this.data.filter(row => row.id !== id);
    this.render();
  }

  /**
   * Update a row
   */
  updateRow(id, updates) {
    const idx = this.data.findIndex(row => row.id === id);
    if (idx > -1) {
      this.data[idx] = { ...this.data[idx], ...updates };
      this.render();
    }
  }

  /**
   * Sort by column
   */
  sort(columnId) {
    if (this.sortColumn === columnId) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnId;
      this.sortDirection = 'asc';
    }

    if (this.onSort) {
      this.onSort(columnId, this.sortDirection);
    }

    this._sortData();
    this.render();
  }

  _sortData() {
    if (!this.sortColumn) return;

    const column = this.columns.find(c => c.id === this.sortColumn);
    if (!column) return;

    this.data.sort((a, b) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];

      // Handle dates
      if (column.type === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      // Handle numbers
      if (column.type === 'number') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }

      // String comparison
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Render the table
   */
  render() {
    if (!this.container) return;

    const html = `
      <div class="sf-table-container">
        <table class="sf-table">
          <thead>
            <tr>
              ${this.columns.map(col => `
                <th class="${col.sortable ? 'sf-sortable' : ''} ${this.sortColumn === col.id ? (this.sortDirection === 'asc' ? 'sf-sort-asc' : 'sf-sort-desc') : ''}"
                    data-column="${col.id}">
                  ${col.label}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${this.data.length === 0 ? `
              <tr>
                <td colspan="${this.columns.length}" style="text-align: center; color: var(--sf-text-muted); padding: 32px;">
                  No data available
                </td>
              </tr>
            ` : this.data.map(row => `
              <tr data-id="${row.id}" class="${this.onRowClick ? 'sf-clickable' : ''}">
                ${this.columns.map(col => `
                  <td>
                    ${col.render ? col.render(row) : this._escapeHtml(row[col.id] || '')}
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.container.innerHTML = html;
    this._bindEvents();
  }

  _bindEvents() {
    // Sort headers
    const headers = this.container.querySelectorAll('th.sf-sortable');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        this.sort(header.dataset.column);
      });
    });

    // Row clicks
    if (this.onRowClick) {
      const rows = this.container.querySelectorAll('tbody tr[data-id]');
      rows.forEach(row => {
        row.addEventListener('click', (e) => {
          // Ignore if clicking a button
          if (e.target.tagName === 'BUTTON') return;

          const id = row.dataset.id;
          const rowData = this.data.find(d => String(d.id) === id);
          if (rowData) {
            this.onRowClick(rowData);
          }
        });
      });
    }
  }

  _escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}

export default Table;
