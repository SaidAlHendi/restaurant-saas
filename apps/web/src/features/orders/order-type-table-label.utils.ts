export function orderTypeTableLabel(input: {
  type: 'dine_in' | 'takeaway';
  tableLabel: string | null;
  customerName: string | null;
  takeawayLabel: string;
}): string {
  if (input.type === 'dine_in') {
    return input.tableLabel ?? input.takeawayLabel;
  }
  return input.customerName ?? input.takeawayLabel;
}

/** Looks up a dine-in order's table label from the branch's tables; null for takeaway or unknown tables. */
export function resolveOrderTableLabel(
  tableId: string | null,
  tables: readonly { id: string; label: string }[] | undefined,
): string | null {
  if (tableId === null || tables === undefined) {
    return null;
  }
  return tables.find((table) => table.id === tableId)?.label ?? null;
}
