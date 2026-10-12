import { SendIcon, ShoppingBagIcon, UtensilsIcon } from 'lucide-react';

import {
  Alert,
  BranchSwitcher,
  Button,
  CartLine,
  CategoryTile,
  ConfirmDialog,
  ConnectionBanner,
  EmptyState,
  Input,
  Label,
  ProductTile,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@app/ui';

import type { PosPageViewModel } from '../hooks/use-pos-page.js';

import { PosModifierSheetView } from './PosModifierSheetView.js';
import { PosOpenOrdersStripView } from './PosOpenOrdersStripView.js';
import { PosOrderDetailSheetView } from './PosOrderDetailSheetView.js';
import { PosPaymentDialogView } from './PosPaymentDialogView.js';

export function PosPageView(props: PosPageViewModel) {
  const {
    realtimeBanner,
    branchSwitcher,
    isLoading,
    isError,
    categoryTabs,
    productTiles,
    search,
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
      <div className="flex flex-1 items-center justify-center">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive p-6">{labels.loadError}</p>;
  }

  if (sentOrder) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border bg-background p-10 text-center shadow-sm">
          <span className="bg-secondary text-secondary-foreground flex size-14 items-center justify-center rounded-full">
            <SendIcon aria-hidden className="size-6 rtl:-scale-x-100" />
          </span>
          <p className="mt-4 text-lg font-semibold">{labels.resultTitle}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{labels.resultOrderNumber}</p>
          <Button type="button" className="mt-8 w-full" size="touch" onClick={onDismissResult}>
            {labels.newOrder}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConnectionBanner {...realtimeBanner} />
      <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b bg-background px-4 py-2">
        <SearchInput
          className="min-w-48 max-w-xl flex-1"
          defaultValue={search.value}
          onValueChange={search.onChange}
          delay={150}
          placeholder={search.placeholder}
          aria-label={search.placeholder}
          clearLabel={search.clearLabel}
        />
        <div className="ms-auto flex min-w-0 items-center gap-3">
          <BranchSwitcher {...branchSwitcher} className="w-56 max-w-full" />
        </div>
      </header>

      {addingItemsHint ? (
        <p className="bg-secondary text-secondary-foreground shrink-0 px-4 py-2 text-sm font-medium">
          {addingItemsHint}
        </p>
      ) : null}

      {showOfflineBanner ? (
        <Alert
          variant="destructive"
          className="mx-4 mt-3 flex w-auto shrink-0 flex-wrap items-center justify-between gap-2"
        >
          <span>{offlineMessage}</span>
          <Button type="button" size="sm" variant="secondary" onClick={onRetrySend}>
            {labels.retry}
          </Button>
        </Alert>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 gap-3 overflow-x-auto px-4 pb-2 pt-4">
            {categoryTabs.map((tab) => (
              <CategoryTile
                key={tab.id}
                label={tab.label}
                countLabel={tab.countLabel}
                active={tab.isActive}
                onPress={tab.onSelect}
              />
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
            {productTiles.length === 0 ? (
              <EmptyState title={search.noResults} className="py-16" />
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
                {productTiles.map((tile) => (
                  <ProductTile
                    key={tile.id}
                    name={tile.name}
                    priceLabel={tile.priceLabel}
                    imageUrl={tile.imageUrl}
                    hint={tile.hint}
                    onPress={tile.onPress}
                    stepper={tile.stepper}
                  />
                ))}
              </div>
            )}
          </div>
          <PosOpenOrdersStripView {...openOrders} />
        </section>

        <aside className="flex min-h-0 shrink-0 flex-col border-t bg-background lg:w-96 lg:border-s lg:border-t-0">
          <div className="flex shrink-0 flex-col gap-4 border-b px-5 py-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{labels.cartTitle}</h2>
              <span className="text-muted-foreground text-sm tabular-nums">{labels.cartCount}</span>
            </div>
            <div className="bg-muted grid grid-cols-2 gap-1 rounded-full p-1">
              <Button
                type="button"
                className="rounded-full"
                variant={orderType === 'dine_in' ? 'default' : 'ghost'}
                aria-pressed={orderType === 'dine_in'}
                onClick={() => {
                  onOrderTypeChange('dine_in');
                }}
              >
                <UtensilsIcon aria-hidden />
                {labels.orderTypeDineIn}
              </Button>
              <Button
                type="button"
                className="rounded-full"
                variant={orderType === 'takeaway' ? 'default' : 'ghost'}
                aria-pressed={orderType === 'takeaway'}
                onClick={() => {
                  onOrderTypeChange('takeaway');
                }}
              >
                <ShoppingBagIcon aria-hidden />
                {labels.orderTypeTakeaway}
              </Button>
            </div>
            {orderType === 'dine_in' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pos-table">{labels.table}</Label>
                <Select
                  value={tableId ?? ''}
                  onValueChange={(value) => {
                    onTableChange(value.length > 0 ? value : null);
                  }}
                >
                  <SelectTrigger id="pos-table" size="touch">
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pos-customer">{labels.customer}</Label>
                <Input
                  id="pos-customer"
                  className="h-12"
                  value={customerName}
                  onChange={(event) => {
                    onCustomerNameChange(event.target.value);
                  }}
                />
              </div>
            )}
          </div>

          <div className="min-h-40 flex-1 overflow-y-auto px-5">
            {cartEmpty ? (
              <EmptyState title={labels.cartEmpty} className="border-0 py-12" />
            ) : (
              cartLines.map((line) => <CartLine key={line.localId} {...line} />)
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pos-note">{labels.orderNote}</Label>
              <Textarea
                id="pos-note"
                value={orderNote}
                onChange={(event) => {
                  onOrderNoteChange(event.target.value);
                }}
                rows={1}
                className="min-h-10"
              />
            </div>
            {totals ? (
              <dl className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{labels.subtotal}</dt>
                  <dd className="tabular-nums">{formatMinor(totals.subtotalMinor)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{labels.tax}</dt>
                  <dd className="tabular-nums">{formatMinor(totals.taxMinor)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <dt>{labels.total}</dt>
                  <dd className="tabular-nums">{formatMinor(totals.totalMinor)}</dd>
                </div>
              </dl>
            ) : null}
            <Button
              type="button"
              className="h-14 w-full rounded-xl text-base"
              size="touch"
              disabled={sendDisabled}
              isLoading={sending}
              onClick={() => {
                void onSendToKitchen();
              }}
            >
              {labels.sendToKitchen}
            </Button>
          </div>
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
