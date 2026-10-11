export type CartLine = {
  localId: string;
  productId: string;
  nameSnapshot: Record<string, string>;
  unitPriceMinor: number;
  modifierIds: string[];
  modifierNames: Record<string, Record<string, string>>;
  quantity: number;
  note: string;
};

export type CartOrderType = 'dine_in' | 'takeaway';

export type CartState = {
  branchId: string | null;
  clientOrderId: string;
  orderType: CartOrderType;
  tableId: string | null;
  customerName: string;
  orderNote: string;
  lines: CartLine[];
};
