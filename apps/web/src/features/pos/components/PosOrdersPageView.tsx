import {
  Badge,
  Button,
  ConnectionBanner,
  EmptyState,
  SearchInput,
  Spinner,
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
    labels,
  } = props;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <ConnectionBanner visible={realtimeBanner.visible} message={realtimeBanner.message} />
      <h1 className="text-xl font-semibold">{labels.title}</h1>
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
            value={search.value}
            onValueChange={search.onChange}
            placeholder={search.placeholder}
            clearLabel={search.clearLabel}
          />
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner label={labels.loading} />
            </div>
          ) : null}
          {isError ? (
            <EmptyState title={errorLabel} actionLabel={labels.loading} onAction={onRetry} />
          ) : null}
          {!isLoading && !isError && rows.length === 0 ? <EmptyState title={emptyLabel} /> : null}
          {!isLoading && !isError && rows.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                        onClick={row.onSelect}
                      >
                        <td className="p-3 font-semibold tabular-nums">#{String(row.orderNumber)}</td>
                        <td className="p-3 tabular-nums">{row.timeLabel}</td>
                        <td className="p-3">{row.typeTable}</td>
                        <td className="p-3 tabular-nums">{String(row.itemCount)}</td>
                        <td className="p-3 tabular-nums">{row.totalLabel}</td>
                        <td className="p-3">
                          <Badge variant={row.statusTone}>{row.statusLabel}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{row.paymentLabel}</Badge>
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
                        <span className="font-semibold tabular-nums">#{String(row.orderNumber)}</span>
                        <span className="text-muted-foreground text-sm tabular-nums">{row.timeLabel}</span>
                      </div>
                      <p className="mt-1 text-sm">{row.typeTable}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={row.statusTone}>{row.statusLabel}</Badge>
                        <Badge variant="outline">{row.paymentLabel}</Badge>
                        <span className="ms-auto font-medium tabular-nums">{row.totalLabel}</span>
                      </div>
                    </button>
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
