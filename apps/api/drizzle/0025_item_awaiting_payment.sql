-- Additions to a sent order wait here (hidden from the kitchen) until the order is paid, when the branch has pay-before-send on.
ALTER TYPE "public"."order_item_status" ADD VALUE IF NOT EXISTS 'awaiting_payment' BEFORE 'pending';
