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
