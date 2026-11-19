export type CartLine = {
  localId: string;
  productId: string;
  nameSnapshot: Record<string, string>;
  unitPriceMinor: number;
  modifierIds: string[];
  modifierNames: Record<string, Record<string, string>>;
  quantity: number;
  note: string;
  /** Guest label ("Guest 1") so the guest can pay for their own items on a table bill. */
  seat?: string | undefined;
};

export type CartLineInput = Omit<CartLine, 'localId'>;

export type CartOrderType = 'dine_in' | 'takeaway';

export type CartState = {
  branchId: string | null;
  clientOrderId: string;
  orderType: CartOrderType;
  tableId: string | null;
  customerName: string;
  /** Digits only; empty when no pager was handed out. */
  pagerNumber: string;
  orderNote: string;
  /** Guest label given to the next lines added; empty for none. */
  seat: string;
  /** Dine-in bill: '' = the table's bill, 'new' = a separate bill, otherwise a bill id. */
  billChoice: string;
  lines: CartLine[];
};
