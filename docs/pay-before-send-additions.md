# Pay before send: additions to a sent order

Status: BUILT (migration `0025_item_awaiting_payment`, journal idx 24). Said approved; numbering 0025 chosen to avoid his local 0024_*.

## Problem
With `branch.payBeforeSend` on, a new order is a `draft` until paid, then it reaches the kitchen.
Additions to a Placed/Preparing order skip that: `OrderingService.addItems` inserts them as
`pending`/`preparing` at once, the KDS shows them, payment is collected later (or never).

## Rule
With payBeforeSend on, additions reach the kitchen only after the order is fully paid again.
With it off, nothing changes (additions go straight to the kitchen).

## Design
1. Migration: add value `awaiting_payment` to enum `order_item_status` (additive, no data change).
2. `addItems`: if branch.payBeforeSend and order is placed/preparing, new items get status
   `awaiting_payment` (isAddition stays true). Totals and paymentStatus (partial) update as today.
3. Kitchen board (`listKitchenBoardOrders` / items mapping): hide `awaiting_payment` items.
4. Payment capture: when the order becomes fully paid, flip its `awaiting_payment` items to
   `pending` (or `preparing` if the order is preparing) and write an `items_added`-style outbox
   event so the KDS and POS refresh.
5. Void of a held item stays allowed (cashier changed their mind).
6. Web, add mode with payBeforeSend: button "Pay & send additions" = save held items, open the
   payment dialog for the amount due. On success: toast "N items sent to the kitchen", print the
   additions ticket (if the print switch is on). If the cashier closes the dialog, items stay held:
   the order sheet shows them with an "Awaiting payment" badge and the normal Pay button.
7. Tests: API e2e (hold, hidden on KDS, release on payment, void held item, payBeforeSend off
   unchanged); web unit for the new labels/flow.

## Open points
- Migration number: this checkout's last file is 0023. Said has local `0024_*` files elsewhere.
- Partial payment: items are released only when the order is fully paid (same as a draft).
