import { Badge, Button, Spinner } from '@app/ui';

export type OpenOrderRow = {
  id: string;
  orderNumberLabel: string;
  statusLabel: string;
  totalLabel: string;
  metaLabel: string;
  onSelect: () => void;
};

export type PosOpenOrdersPanelViewProps = {
  open: boolean;
  onToggle: () => void;
  orders: OpenOrderRow[];
  isLoading: boolean;
  labels: {
    title: string;
    empty: string;
    toggle: string;
    close: string;
  };
};

export function PosOpenOrdersToggle(props: Pick<PosOpenOrdersPanelViewProps, 'open' | 'onToggle' | 'labels'>) {
  if (props.open) {
    return null;
  }
  return (
    <Button type="button" size="touch" variant="outline" onClick={props.onToggle}>
      {props.labels.toggle}
    </Button>
  );
}

export function PosOpenOrdersPanelView(props: PosOpenOrdersPanelViewProps) {
  const { open, onToggle, orders, isLoading, labels } = props;

  if (!open) {
    return null;
  }

  return (
    <aside className="border-b bg-muted/30 p-4 lg:border-b-0 lg:border-s">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{labels.title}</h2>
        <Button type="button" size="sm" variant="ghost" onClick={onToggle}>
          {labels.close}
        </Button>
      </div>
      {isLoading ? (
        <Spinner label={labels.title} />
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">{labels.empty}</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto lg:max-h-[calc(100dvh-12rem)]">
          {orders.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                className="hover:bg-accent flex w-full min-h-12 flex-col rounded-md border bg-card p-3 text-start shadow-sm"
                onClick={order.onSelect}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums">{order.orderNumberLabel}</span>
                  <Badge variant="secondary">{order.statusLabel}</Badge>
                </div>
                <span className="text-muted-foreground text-xs">{order.metaLabel}</span>
                <span className="mt-1 text-sm font-medium tabular-nums">{order.totalLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
