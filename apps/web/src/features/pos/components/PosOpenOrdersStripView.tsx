import { OpenOrderChip, Spinner, type OrderStatus } from '@app/ui';

export type OpenOrderRow = {
  id: string;
  code: string;
  title: string;
  detail: string;
  status: OrderStatus;
  statusLabel: string;
  onSelect: () => void;
};

export type PosOpenOrdersStripViewProps = {
  orders: OpenOrderRow[];
  isLoading: boolean;
  labels: {
    title: string;
    empty: string;
  };
};

/** Active orders along the bottom of the POS; tap one to open its details. */
export function PosOpenOrdersStripView({ orders, isLoading, labels }: PosOpenOrdersStripViewProps) {
  return (
    <section
      aria-label={labels.title}
      className="flex shrink-0 items-center gap-3 border-t bg-background px-4 py-3"
    >
      <h2 className="sr-only">{labels.title}</h2>
      {isLoading ? (
        <Spinner label={labels.title} />
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground py-4 text-sm">{labels.empty}</p>
      ) : (
        <ul className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1">
          {orders.map((order) => (
            <li key={order.id}>
              <OpenOrderChip
                code={order.code}
                title={order.title}
                detail={order.detail}
                status={order.status}
                statusLabel={order.statusLabel}
                onPress={order.onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
