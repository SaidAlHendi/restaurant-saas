# Order handover: review notes

Branch `feat/order-handover`. Rules are in `docs/product.md` and `docs/data-model.md`.
This file lists what a manual browser test found, for the code review. Nothing here is fixed in this PR.

## Open findings (manual test, POS at 1024x768, English, cashier)

1. **Ready tab hides older ready orders (likely bug).** `tabToListQuery` for the Ready tab sends
   `status=ready&todayOnly=true`, so a ready order from an earlier business day does not show there,
   only in Active. Goal says a ready order stays visible until completed. Suggested fix: drop `todayOnly`
   for the Ready tab. Code: `apps/web/src/features/pos/pos-orders-list.utils.ts`.
2. **No feedback before the payment dialog opens (polish).** Tapping "Picked up"/"Served" on an unpaid
   row fetches the order first (`handoverRow` in `use-pos-orders-page.ts`). The first tap showed nothing for
   a few seconds (the fetch got a 401, refreshed the token and retried). Suggested fix: loading state on the button.
3. **Active list went empty after a status change (cause unknown).** After the first handover and Undo the list
   showed "No orders match this view" with 401s on the list and order requests in the console. A reload fixed it.
   The list reload code (`reloadFirstPage` / `accumulated` in `use-pos-orders-page.ts`) was not changed by this PR.
   Not checked whether it also happens on `dev`. A second browser tab sharing the session may have caused the 401s.
   Needs a repro on `dev` before deciding.

## Not tested in a browser

KDS (no Start button, first-tick auto-Preparing, 5 s Undo after Ready, POS to KDS realtime), the order detail
sheet button, Arabic RTL, pay-before-send in the UI, public menu and owner pages.

## Verified by tests

API unit and e2e (handover, ORDER_NOT_PAID, auto-Preparing, undo window and version conflict, pay-before-send
on/off for takeaway and dine-in) and web unit tests. See `apps/api/test/ordering-handover.e2e-spec.ts` and
`apps/web/src/features/pos/hooks/use-pos-handover.test.ts`.

## Follow-ups (out of scope)

Reopen/Recall for old completed orders, optional 15-minute auto-complete, permissions UI.
