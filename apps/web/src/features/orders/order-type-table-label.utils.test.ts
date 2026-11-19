import { describe, expect, it } from 'vitest';

import { resolveOrderTableLabel } from './order-type-table-label.utils.js';

describe('resolveOrderTableLabel', () => {
  const tables = [
    { id: 't1', label: 'T1' },
    { id: 't2', label: 'Terrace 2' },
  ];

  it('finds the label of the order table', () => {
    expect(resolveOrderTableLabel('t2', tables)).toBe('Terrace 2');
  });

  it('is null for takeaway, unknown tables and tables not loaded yet', () => {
    expect(resolveOrderTableLabel(null, tables)).toBeNull();
    expect(resolveOrderTableLabel('nope', tables)).toBeNull();
    expect(resolveOrderTableLabel('t1', undefined)).toBeNull();
  });
});
