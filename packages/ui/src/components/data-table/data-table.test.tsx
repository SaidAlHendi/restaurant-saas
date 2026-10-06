import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { nextSort, type DataTableColumn } from '../../hooks/use-data-table.js';
import { DataTable } from './data-table.js';

interface Order {
  id: string;
  number: number;
  total: string;
}

const columns: DataTableColumn<Order>[] = [
  { id: 'number', header: 'Order', cell: (o) => `#${String(o.number)}`, sortable: true },
  { id: 'total', header: 'Total', cell: (o) => o.total, align: 'end' },
];
const rows: Order[] = [
  { id: 'a', number: 41, total: '18.50' },
  { id: 'b', number: 42, total: '7.00' },
];
const labels = { actions: 'Actions', sortBy: 'Sort by' };

describe('nextSort', () => {
  it('cycles none -> asc -> desc -> none and restarts on another column', () => {
    expect(nextSort(null, 'number')).toEqual({ id: 'number', desc: false });
    expect(nextSort({ id: 'number', desc: false }, 'number')).toEqual({ id: 'number', desc: true });
    expect(nextSort({ id: 'number', desc: true }, 'number')).toBeNull();
    expect(nextSort({ id: 'number', desc: true }, 'total')).toEqual({ id: 'total', desc: false });
  });
});

describe('DataTable', () => {
  it('renders rows, row actions and aria-sort', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const onRowClick = vi.fn();
    const onEdit = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(o) => o.id}
        emptyState="No orders"
        sort={{ id: 'number', desc: true }}
        onSortChange={onSortChange}
        onRowClick={onRowClick}
        rowActions={(o) => (
          <button
            type="button"
            onClick={() => {
              onEdit(o.id);
            }}
          >
            Edit {o.number}
          </button>
        )}
        labels={labels}
      />,
    );

    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: /Order/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await user.click(screen.getByRole('button', { name: 'Sort by Order' }));
    expect(onSortChange).toHaveBeenCalledWith(null);

    await user.click(screen.getByRole('button', { name: 'Edit 42' }));
    expect(onEdit).toHaveBeenCalledWith('b');
    expect(onRowClick).not.toHaveBeenCalled();

    await user.click(screen.getByRole('cell', { name: '#41' }));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('shows skeleton rows while loading', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(o) => o.id}
        emptyState="No orders"
        isLoading
        loadingRows={3}
        labels={labels}
      />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('#41')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('shows the empty state and the error state', () => {
    const { rerender } = render(
      <DataTable
        columns={columns}
        data={[]}
        getRowId={(o) => o.id}
        emptyState="No orders yet"
        labels={labels}
      />,
    );
    expect(screen.getByText('No orders yet')).toBeInTheDocument();

    rerender(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(o) => o.id}
        emptyState="No orders yet"
        error="Could not load orders"
        labels={labels}
      />,
    );
    expect(screen.getByText('Could not load orders')).toBeInTheDocument();
    expect(screen.queryByText('#41')).not.toBeInTheDocument();
  });

  it('hides columns turned off in columnVisibility', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(o) => o.id}
        emptyState="-"
        columnVisibility={{ total: false }}
        labels={labels}
      />,
    );
    const header = screen.getAllByRole('row')[0];
    expect(header).toBeDefined();
    expect(within(header as HTMLElement).queryByText('Total')).not.toBeInTheDocument();
  });
});
