import { Badge, Button, Card, CardContent, EmptyState, PageHeader, Spinner } from '@app/ui';

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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {vm.cards.map((card) => (
            <Card key={card.id} className={card.busy ? 'border-primary' : undefined}>
              <CardContent className="flex flex-col gap-3 p-4">
                <button
                  type="button"
                  className="flex flex-col gap-2 text-start"
                  disabled={!vm.canOrder}
                  onClick={() => {
                    vm.openOrderScreen(card.id);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold">{card.label}</span>
                    <Badge variant={!card.busy ? 'outline' : card.settled ? 'success' : 'warning'}>
                      {!card.busy
                        ? t('pos.tables.free')
                        : card.settled
                          ? t('pos.tables.settled')
                          : t('pos.tables.busy')}
                    </Badge>
                  </div>
                  {card.busy ? (
                    <>
                      <p className="text-muted-foreground text-sm">
                        {t('pos.bills.rounds', { count: card.rounds })}
                        {card.billCount > 1
                          ? ` · ${t('pos.tables.bills', { count: card.billCount })}`
                          : ''}
                      </p>
                      {card.pagers.length > 0 ? (
                        <p className="text-muted-foreground text-sm">
                          {t('pos.tables.pager', { numbers: card.pagers.join(', ') })}
                        </p>
                      ) : null}
                      <div className="flex items-baseline justify-between">
                        <span className="text-muted-foreground text-sm">{t('pos.bills.due')}</span>
                        <span className="text-xl font-semibold tabular-nums">{card.dueLabel}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">{t('pos.tables.freeHint')}</p>
                  )}
                </button>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
