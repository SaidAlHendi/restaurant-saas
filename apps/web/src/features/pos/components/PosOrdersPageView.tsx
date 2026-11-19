import {
  Badge,
  Button,
  ConnectionBanner,
  EmptyState,
  Label,
  SearchInput,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@app/ui';

import type { PosOrdersPageViewModel } from '../hooks/use-pos-orders-page.js';

import { PosOrderDetailSheetView } from './PosOrderDetailSheetView.js';
import { PosPaymentDialogView } from './PosPaymentDialogView.js';

export function PosOrdersPageView(props: PosOrdersPageViewModel) {
  const {
    tab,
    tabs,
    search,
    todaySwitch,
    tableHeaders,
    olderHint,
    rows,
    isLoading,
    isError,
    emptyLabel,
    errorLabel,
    loadMore,
    realtimeBanner,
    orderDetail,
    paymentDialog,
    onRetry,
    lock,
    labels,
  } = props;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <ConnectionBanner visible={realtimeBanner.visible} message={realtimeBanner.message} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{labels.title}</h1>
        <Button type="button" size="sm" variant="outline" onClick={lock.onPress}>
          {lock.label}
        </Button>
      </div>
      <Tabs value={tab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              onClick={() => {
                tab.onSelect();
              }}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-4">
          <SearchInput
            defaultValue=""
            onValueChange={search.onChange}
            delay={300}
            placeholder={search.placeholder}
            clearLabel={search.clearLabel}
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="pos-orders-today-only"
                checked={todaySwitch.checked}
                onCheckedChange={todaySwitch.onChange}
              />
              <Label htmlFor="pos-orders-today-only">{todaySwitch.label}</Label>
            </div>
            {olderHint ? (
              <p className="text-muted-foreground text-sm" role="status">
                {olderHint.message}{' '}
                <button
                  type="button"
                  className="text-primary font-medium underline underline-offset-2"
                  onClick={olderHint.onShowAll}
                >
                  {olderHint.actionLabel}
                </button>
              </p>
            ) : null}
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner label={labels.loading} />
            </div>
          ) : null}
          {isError ? (
            <EmptyState
              title={errorLabel}
              action={
                <Button type="button" variant="outline" onClick={onRetry}>
                  {labels.retry}
                </Button>
              }
            />
          ) : null}
          {!isLoading && !isError && rows.length === 0 ? <EmptyState title={emptyLabel} /> : null}
          {!isLoading && !isError && rows.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">{tableHeaders.order}</th>
                      <th scope="col">{tableHeaders.time}</th>
                      <th scope="col">{tableHeaders.typeTable}</th>
                      <th scope="col">{tableHeaders.items}</th>
                      <th scope="col">{tableHeaders.total}</th>
                      <th scope="col">{tableHeaders.status}</th>
                      <th scope="col">{tableHeaders.payment}</th>
                      <th scope="col">{tableHeaders.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-table-hover cursor-pointer [&:last-child>td]:border-b-0"
                        onClick={row.onSelect}
                      >
                        <td className="border-b px-4 py-3 font-semibold tabular-nums">
                          #{String(row.orderNumber)}
                        </td>
                        <td className="border-b px-4 py-3 tabular-nums">{row.timeLabel}</td>
                        <td className="border-b px-4 py-3">{row.typeTable}</td>
                        <td className="border-b px-4 py-3 tabular-nums">{String(row.itemCount)}</td>
                        <td className="border-b px-4 py-3 tabular-nums">{row.totalLabel}</td>
                        <td className="border-b px-4 py-3">
                          <Badge variant={row.statusTone}>{row.statusLabel}</Badge>
                        </td>
                        <td className="border-b px-4 py-3">
                          <Badge variant="outline">{row.paymentLabel}</Badge>
                        </td>
                        <td className="border-b px-4 py-3 text-end">
                          {row.handover ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={row.handover.loading}
                              onClick={(event) => {
                                event.stopPropagation();
                                row.handover?.onClick();
                              }}
                            >
                              {row.handover.loading ? <Spinner label={labels.loading} /> : null}
                              {row.handover.label}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="flex flex-col gap-3 md:hidden">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl border bg-background p-4 text-start shadow-sm"
                      onClick={row.onSelect}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold tabular-nums">
                          #{String(row.orderNumber)}
                        </span>
                        <span className="text-muted-foreground text-sm tabular-nums">
                          {row.timeLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{row.typeTable}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={row.statusTone}>{row.statusLabel}</Badge>
                        <Badge variant="outline">{row.paymentLabel}</Badge>
                        <span className="ms-auto font-medium tabular-nums">{row.totalLabel}</span>
                      </div>
                    </button>
                    {row.handover ? (
                      <Button
                        type="button"
                        size="touch"
                        className="mt-2 w-full"
                        disabled={row.handover.loading}
                        onClick={row.handover.onClick}
                      >
                        {row.handover.loading ? <Spinner label={labels.loading} /> : null}
                        {row.handover.label}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {loadMore ? (
                <Button
                  type="button"
                  variant="outline"
                  size="touch"
                  className="w-full"
                  disabled={loadMore.loading}
                  onClick={loadMore.onClick}
                >
                  {loadMore.label}
                </Button>
              ) : null}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
      <PosOrderDetailSheetView {...orderDetail} />
      <PosPaymentDialogView {...paymentDialog} />
    </div>
  );
}
