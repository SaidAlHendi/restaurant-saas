import { pickLocalizedText } from '@app/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Label,
  MoneyInput,
  PageHeader,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@app/ui';

import { moneyFormatter } from '../../../lib/money.js';
import type { usePosBillsPage } from '../hooks/use-pos-bills-page.js';
import { NO_SEAT } from '../pos-bill.utils.js';

export type PosBillsPageViewProps = ReturnType<typeof usePosBillsPage>;

export function PosBillsPageView(vm: PosBillsPageViewProps) {
  const { t, bill } = vm;

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader title={t('pos.bills.title')} description={t('pos.bills.description')} />

      {vm.isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner label={t('common.loading')} />
        </div>
      ) : vm.isError ? (
        <EmptyState
          title={t('pos.bills.loadError')}
          action={
            <Button variant="outline" onClick={vm.retry}>
              {t('pos.retry')}
            </Button>
          }
        />
      ) : vm.bills.length === 0 ? (
        <EmptyState title={t('pos.bills.empty')} description={t('pos.bills.emptyHint')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vm.bills.map((b) => (
            <button
              key={b.id}
              type="button"
              className="text-start"
              onClick={() => {
                vm.selectBill(b.id);
              }}
            >
              <Card className="hover:border-primary transition-colors">
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold">
                      {b.tableLabel ?? t('pos.bills.table')}
                      {b.label ? ` · ${b.label}` : ''}
                    </span>
                    <Badge variant={b.dueMinor === 0 ? 'success' : 'warning'}>
                      {b.dueMinor === 0 ? t('pos.bills.settled') : t('pos.bills.open')}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {t('pos.bills.rounds', { count: b.orders.length })}
                  </p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground text-sm">{t('pos.bills.due')}</span>
                    <span className="text-xl font-semibold tabular-nums">
                      {formatBillAmount(b, vm.uiLocale, b.dueMinor)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={bill !== undefined}
        onOpenChange={(open) => {
          if (!open) vm.selectBill(null);
        }}
      >
        <SheetContent side="end" size="lg" closeLabel={t('pos.bills.dismiss')}>
          {bill ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {bill.tableLabel ?? t('pos.bills.table')}
                  {bill.label ? ` · ${bill.label}` : ''}
                </SheetTitle>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-4 overflow-y-auto">
                {vm.seats.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {vm.seats.map((seat) => {
                      const on = seat.itemIds.every((id) => vm.selected.has(id));
                      return (
                        <Button
                          key={seat.seat}
                          type="button"
                          size="sm"
                          variant={on ? 'default' : 'outline'}
                          onClick={() => {
                            vm.toggleSeat(seat.itemIds);
                          }}
                        >
                          {seat.seat === NO_SEAT ? t('pos.bills.noSeat') : seat.seat} ·{' '}
                          {vm.formatTotal(seat.dueMinor)}
                        </Button>
                      );
                    })}
                    <Button type="button" size="sm" variant="ghost" onClick={vm.selectAll}>
                      {t('pos.bills.selectAll')}
                    </Button>
                    {vm.selected.size > 0 ? (
                      <Button type="button" size="sm" variant="ghost" onClick={vm.clearSelection}>
                        {t('pos.bills.clear')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {bill.orders.map((order) => (
                  <section key={order.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-muted-foreground text-sm font-medium">
                        {t('pos.bills.round', { round: order.round })} · #{order.orderNumber}
                        {order.pagerNumber !== null
                          ? ` · ${t('pos.tables.pagerOne', { number: order.pagerNumber })}`
                          : ''}
                      </h3>
                      {vm.canPay && bill.orders.length > 1 && vm.movableIds.includes(order.id) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            vm.openMove([order.id]);
                          }}
                        >
                          {t('pos.bills.moveRound')}
                        </Button>
                      ) : null}
                    </div>
                    <ul className="divide-y">
                      {order.items.map((item) => {
                        const due = vm.itemDue(item);
                        const name = pickLocalizedText(
                          item.productNameSnapshot,
                          vm.uiLocale.slice(0, 2),
                          vm.defaultLocale,
                        );
                        return (
                          <li key={item.id} className="flex items-center gap-3 py-2">
                            <Checkbox
                              aria-label={name}
                              disabled={due === 0 || !vm.canPay}
                              checked={vm.selected.has(item.id)}
                              onCheckedChange={() => {
                                vm.toggleItem(item.id);
                              }}
                            />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className={item.voided ? 'line-through' : undefined}>
                                {item.quantity}× {name}
                              </span>
                              {item.seat ? (
                                <span className="text-muted-foreground text-xs">{item.seat}</span>
                              ) : null}
                            </div>
                            {item.voided ? (
                              <Badge variant="outline">{t('pos.bills.voided')}</Badge>
                            ) : due === 0 ? (
                              <Badge variant="success">{t('pos.bills.itemPaid')}</Badge>
                            ) : (
                              <span className="tabular-nums">{vm.formatTotal(due)}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </SheetBody>
              <SheetFooter className="flex flex-col gap-2">
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t('pos.bills.total')}</dt>
                    <dd className="font-semibold tabular-nums">
                      {vm.formatTotal(bill.totalMinor)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('pos.bills.paidSoFar')}</dt>
                    <dd className="font-semibold tabular-nums">{vm.formatTotal(bill.paidMinor)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('pos.bills.due')}</dt>
                    <dd className="font-semibold tabular-nums">{vm.formatTotal(bill.dueMinor)}</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  size="touch"
                  disabled={!vm.canPay || vm.payMinor === 0}
                  onClick={vm.openPay}
                >
                  {vm.payMinor > 0
                    ? t('pos.bills.paySelected', { amount: vm.formatTotal(vm.payMinor) })
                    : t('pos.bills.selectToPay')}
                </Button>
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  disabled={!vm.canPay || !vm.canClose}
                  isLoading={vm.closing}
                  onClick={vm.closeTable}
                >
                  {t('pos.bills.closeTable')}
                </Button>
                <Button
                  type="button"
                  size="touch"
                  variant="ghost"
                  disabled={!vm.canPay || vm.movableIds.length === 0}
                  onClick={() => {
                    vm.openMove(vm.movableIds);
                  }}
                >
                  {t('pos.bills.moveTable')}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={vm.moveOpen}
        onOpenChange={(open) => {
          if (!open) vm.closeMove();
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('pos.bills.moveTitle', { count: vm.moveCount })}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-2">
            <Label htmlFor="move-target">{t('pos.bills.moveTo')}</Label>
            <Select value={vm.moveTarget} onValueChange={vm.setMoveTarget}>
              <SelectTrigger id="move-target" size="touch">
                <SelectValue placeholder={t('pos.table')} />
              </SelectTrigger>
              <SelectContent>
                {vm.moveTargets.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-sm">{t('pos.bills.moveHint')}</p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={vm.closeMove}>
              {t('pos.bills.moveCancel')}
            </Button>
            <Button
              type="button"
              disabled={vm.moveTarget === ''}
              isLoading={vm.moving}
              onClick={vm.confirmMove}
            >
              {t('pos.bills.moveConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={vm.payOpen}
        onOpenChange={(open) => {
          if (!open) vm.closePay();
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('pos.bills.payTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm">
              {t('pos.bills.due')}:{' '}
              <span className="font-semibold tabular-nums">{vm.formatTotal(vm.payMinor)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="touch"
                variant={vm.method === 'cash' ? 'default' : 'outline'}
                onClick={() => {
                  vm.setMethod('cash');
                }}
              >
                {t('pos.payment.methodCash')}
              </Button>
              {vm.showCard ? (
                <Button
                  type="button"
                  size="touch"
                  variant={vm.method === 'card' ? 'default' : 'outline'}
                  onClick={() => {
                    vm.setMethod('card');
                  }}
                >
                  {t('pos.payment.methodCard')}
                </Button>
              ) : null}
            </div>
            {vm.method === 'cash' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="bill-tendered">{t('pos.payment.tendered')}</Label>
                  <MoneyInput
                    id="bill-tendered"
                    currency={vm.cashCurrency}
                    locale={vm.uiLocale}
                    size="touch"
                    value={vm.tenderedMinor}
                    onValueChange={vm.setTenderedMinor}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {vm.quickAmounts.map((amount) => (
                    <Button
                      key={String(amount)}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="min-h-12"
                      onClick={() => {
                        vm.setTenderedMinor(amount);
                      }}
                    >
                      {vm.formatCash(amount)}
                    </Button>
                  ))}
                </div>
                {vm.changeMinor > 0 ? (
                  <p className="text-sm">
                    {t('pos.payment.change')}:{' '}
                    <span className="font-semibold tabular-nums">
                      {vm.formatCash(vm.changeMinor)}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" size="touch" onClick={vm.closePay}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              size="touch"
              disabled={!vm.canSubmitPayment}
              isLoading={vm.submitting}
              onClick={vm.submitPayment}
            >
              {t('pos.payment.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatBillAmount(
  bill: { currency: string; display: Parameters<typeof moneyFormatter>[2] },
  uiLocale: string,
  minor: number,
): string {
  return moneyFormatter(bill.currency, uiLocale, bill.display)(minor, 'total');
}
