import { Badge, Button, EmptyState, PageHeader, Spinner, cn } from '@app/ui';

import type { usePosTablesPage } from '../hooks/use-pos-tables-page.js';

export type PosTablesPageViewProps = ReturnType<typeof usePosTablesPage>;

export function PosTablesPageView(vm: PosTablesPageViewProps) {
  const { t } = vm;

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title={t('pos.tables.title')} description={t('pos.tables.description')} />

      {vm.isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner label={t('common.loading')} />
        </div>
      ) : vm.isError ? (
        <EmptyState
          title={t('pos.tables.loadError')}
          action={
            <Button variant="outline" onClick={vm.retry}>
              {t('pos.retry')}
            </Button>
          }
        />
      ) : vm.cards.length === 0 ? (
        <EmptyState title={t('pos.tables.empty')} description={t('pos.tables.emptyHint')} />
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
          {vm.cards.map((card) => {
            const tone = !card.busy
              ? 'border-muted-foreground/30 bg-muted/40'
              : card.settled
                ? 'border-success bg-success/15'
                : 'border-warning bg-warning/15';
            const chair = !card.busy
              ? 'bg-muted-foreground/25'
              : card.settled
                ? 'bg-success/50'
                : 'bg-warning/60';
            return (
              <div key={card.id} className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  disabled={!vm.canOrder}
                  className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
                  onClick={() => {
                    vm.openOrderScreen(card.id);
                  }}
                >
                  <div className="flex gap-2">
                    <span aria-hidden className={cn('h-3 w-10 rounded-md', chair)} />
                    <span aria-hidden className={cn('h-3 w-10 rounded-md', chair)} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col gap-2">
                      <span aria-hidden className={cn('h-10 w-3 rounded-md', chair)} />
                      <span aria-hidden className={cn('h-10 w-3 rounded-md', chair)} />
                    </div>
                    <div
                      className={cn(
                        'flex h-28 w-36 flex-col items-center justify-center gap-1 rounded-2xl border-2 shadow-sm',
                        tone,
                      )}
                    >
                      <span className="text-xl font-semibold">{card.label}</span>
                      <Badge
                        variant={!card.busy ? 'outline' : card.settled ? 'success' : 'warning'}
                      >
                        {!card.busy
                          ? t('pos.tables.free')
                          : card.settled
                            ? t('pos.tables.settled')
                            : t('pos.tables.busy')}
                      </Badge>
                      {card.busy ? (
                        <span className="text-sm font-semibold tabular-nums">{card.dueLabel}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span aria-hidden className={cn('h-10 w-3 rounded-md', chair)} />
                      <span aria-hidden className={cn('h-10 w-3 rounded-md', chair)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span aria-hidden className={cn('h-3 w-10 rounded-md', chair)} />
                    <span aria-hidden className={cn('h-3 w-10 rounded-md', chair)} />
                  </div>
                </button>
                {card.busy ? (
                  <p className="text-muted-foreground text-center text-xs">
                    {t('pos.bills.rounds', { count: card.rounds })}
                    {card.billCount > 1
                      ? ` · ${t('pos.tables.bills', { count: card.billCount })}`
                      : ''}
                    {card.pagers.length > 0
                      ? ` · ${t('pos.tables.pager', { numbers: card.pagers.join(', ') })}`
                      : ''}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!vm.canOrder}
                    onClick={() => {
                      vm.openOrderScreen(card.id);
                    }}
                  >
                    {card.busy ? t('pos.tables.addRound') : t('pos.tables.newOrder')}
                  </Button>
                  {card.firstBillId !== null ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (card.firstBillId !== null) vm.openBill(card.firstBillId);
                      }}
                    >
                      {t('pos.tables.bill')}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
