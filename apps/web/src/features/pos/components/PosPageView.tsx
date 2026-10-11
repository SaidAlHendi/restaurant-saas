import {
  Alert,
  BranchSwitcher,
  Button,
  CartLine,
  ConfirmDialog,
  ProductTile,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@app/ui';

import type { PosPageViewModel } from '../hooks/use-pos-page.js';

import { PosModifierSheetView } from './PosModifierSheetView.js';
import { PosOpenOrdersPanelView, PosOpenOrdersToggle } from './PosOpenOrdersPanelView.js';
import { PosOrderDetailSheetView } from './PosOrderDetailSheetView.js';
import { PosPaymentDialogView } from './PosPaymentDialogView.js';

export function PosPageView(props: PosPageViewModel) {
  const {
    branchName,
    branchSwitcher,
    isLoading,
    isError,
    categoryTabs,
    productTiles,
    orderType,
    onOrderTypeChange,
    tableId,
    onTableChange,
    customerName,
    onCustomerNameChange,
    orderNote,
    onOrderNoteChange,
    tableOptions,
    cartLines,
    cartEmpty,
    totals,
    formatMinor,
    onSendToKitchen,
    sending,
    sendDisabled,
    showOfflineBanner,
    offlineMessage,
    onRetrySend,
    sentOrder,
    onDismissResult,
    modifierSheet,
    branchSwitchConfirm,
    openOrders,
    orderDetail,
    paymentDialog,
    addingItemsHint,
    labels,
  } = props;

  if (isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive p-6">{labels.loadError}</p>;
  }

  if (sentOrder) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col p-6">
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border bg-card p-8 text-center shadow-sm">
          <p className="text-lg font-semibold">{labels.resultTitle}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{labels.resultOrderNumber}</p>
          <Button type="button" className="mt-8" size="touch" onClick={onDismissResult}>
            {labels.newOrder}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">{branchName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <PosOpenOrdersToggle {...openOrders} />
            <BranchSwitcher {...branchSwitcher} className="min-w-48" />
          </div>
        </div>
        {addingItemsHint ? (
          <p className="text-primary mt-2 text-sm font-medium">{addingItemsHint}</p>
        ) : null}
      </header>

      {showOfflineBanner ? (
        <Alert
          variant="destructive"
          className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2"
        >
          <span>{offlineMessage}</span>
          <Button type="button" size="sm" variant="secondary" onClick={onRetrySend}>
            {labels.retry}
          </Button>
        </Alert>
      ) : null}

      <div
        className={`grid flex-1 gap-0 lg:grid-cols-[1fr_min(24rem,100%)] ${openOrders.open ? 'xl:grid-cols-[12rem_1fr_min(24rem,100%)]' : ''}`}
      >
        {openOrders.open ? <PosOpenOrdersPanelView {...openOrders} /> : null}
        <section className="flex min-h-0 flex-col border-e p-4">
          <Tabs value={categoryTabs.find((c) => c.isActive)?.id ?? ''}>
            <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-1">
              {categoryTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="min-h-12 px-4"
                  onClick={tab.onSelect}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-4 md:grid-cols-3 xl:grid-cols-4">
            {productTiles.map((tile) => (
              <ProductTile
                key={tile.id}
                name={tile.name}
                priceLabel={tile.priceLabel}
                imageUrl={tile.imageUrl}
                onPress={tile.onPress}
              />
            ))}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col p-4">
          <h2 className="mb-3 text-lg font-semibold">{labels.cartTitle}</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="touch"
              variant={orderType === 'dine_in' ? 'default' : 'outline'}
              onClick={() => {
                onOrderTypeChange('dine_in');
              }}
            >
              {labels.orderTypeDineIn}
            </Button>
            <Button
              type="button"
              size="touch"
              variant={orderType === 'takeaway' ? 'default' : 'outline'}
              onClick={() => {
                onOrderTypeChange('takeaway');
              }}
            >
              {labels.orderTypeTakeaway}
            </Button>
          </div>
          {orderType === 'dine_in' ? (
            <div className="mb-3 space-y-1">
              <label className="text-sm font-medium">{labels.table}</label>
              <Select
                value={tableId ?? ''}
                onValueChange={(value) => {
                  onTableChange(value.length > 0 ? value : null);
                }}
              >
                <SelectTrigger className="min-h-12">
                  <SelectValue placeholder={labels.table} />
                </SelectTrigger>
                <SelectContent>
                  {tableOptions.map((table) => (
                    <SelectItem key={table.id} value={table.id} disabled={table.disabled}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="mb-3 space-y-1">
              <label className="text-sm font-medium">{labels.customer}</label>
              <Textarea
                value={customerName}
                onChange={(event) => {
                  onCustomerNameChange(event.target.value);
                }}
                rows={1}
                className="min-h-12"
              />
            </div>
          )}
          <div className="mb-3 space-y-1">
            <label className="text-sm font-medium">{labels.orderNote}</label>
            <Textarea
              value={orderNote}
              onChange={(event) => {
                onOrderNoteChange(event.target.value);
              }}
              rows={2}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cartEmpty ? (
              <p className="text-muted-foreground text-sm">{labels.cartEmpty}</p>
            ) : (
              cartLines.map((line) => <CartLine key={line.localId} {...line} />)
            )}
          </div>
          {totals ? (
            <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <dt>{labels.subtotal}</dt>
                <dd className="tabular-nums">{formatMinor(totals.subtotalMinor)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{labels.tax}</dt>
                <dd className="tabular-nums">{formatMinor(totals.taxMinor)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>{labels.total}</dt>
                <dd className="tabular-nums">{formatMinor(totals.totalMinor)}</dd>
              </div>
            </dl>
          ) : null}
          <Button
            type="button"
            className="mt-4 w-full"
            size="touch"
            disabled={sendDisabled}
            isLoading={sending}
            onClick={() => {
              void onSendToKitchen();
            }}
          >
            {labels.sendToKitchen}
          </Button>
        </aside>
      </div>

      <PosModifierSheetView sheet={modifierSheet} />
      <PosOrderDetailSheetView {...orderDetail} />
      <PosPaymentDialogView {...paymentDialog} />
      <ConfirmDialog
        open={branchSwitchConfirm.open}
        title={branchSwitchConfirm.title}
        description={branchSwitchConfirm.description}
        confirmLabel={branchSwitchConfirm.confirmLabel}
        cancelLabel={branchSwitchConfirm.cancelLabel}
        onConfirm={branchSwitchConfirm.onConfirm}
        onOpenChange={(open) => {
          if (!open) {
            branchSwitchConfirm.onCancel();
          }
        }}
      />
    </div>
  );
}
