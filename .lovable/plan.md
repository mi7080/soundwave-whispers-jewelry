

## The bug

The "Sync All Incomplete (N)" button shows **N=0** so the button is disabled and clicks do nothing.

**Why:** the bulk sync filter requires `o.icount_docnum` to be present, but both orders in your DB have `icount_docnum: null`. So there's nothing to sync — the iCount API needs a docnum to look up the order.

```
JUDI:     icount_docnum=null, shipping_address1=null  → skipped (no docnum)
Memorial: icount_docnum=null, shipping_address1=null  → skipped (no docnum)
```

The single-row "Sync iCount" button has the same problem and also can't run.

## Root cause

`icount_docnum` is only written by the `icount-payment-webhook` when a real iCount payment completes. These two orders were created before payment finished (or the webhook never fired), so they have no docnum and **can never be synced from iCount** by the current edge function.

## The fix

Two parts — make the button actually work for orders that *do* have a docnum, and give you a path forward for orders that don't.

### 1. Manual docnum entry (unblocks the existing 2 orders)

Add a small "Set iCount docnum" input + button in the order detail modal's Shipping section, shown when `icount_docnum` is null. You paste the docnum from your iCount dashboard, it saves to the row, then the existing "Sync iCount" button works normally.

### 2. Make the bulk button visible even when count is 0

Right now `incompleteCount=0` makes the button look broken (greyed out, no feedback). Change it to:
- Always render the button when there are *any* incomplete orders in range (regardless of docnum)
- If clicked and no orders have a docnum, show a clear toast: *"X orders are incomplete but have no iCount docnum. Open each order and paste the docnum from iCount, then sync."*
- If some have docnums and some don't, sync the ones that can be synced and report the rest in the summary toast.

### 3. Improve sync edge function error handling

Wrap the iCount API failure paths to return `200 + { success:false, fallback:true, error }` instead of `502`, so one bad order doesn't break the bulk loop and the client gets a clean per-order error message in the summary toast.

### 4. Visual hint on incomplete rows

In the orders table, when a row is flagged "Data Incomplete" AND has no `icount_docnum`, show the badge as *"Needs Docnum"* (amber) instead of *"Data Incomplete"* (red), so it's obvious which orders need manual docnum entry vs. which just need a sync click.

## Files changed

- `src/pages/AdminOrders.tsx` — bulk button always-on logic, manual docnum input in modal, smarter incomplete badge, better toast messages
- `supabase/functions/sync-icount-order/index.ts` — return `200 + fallback:true` on iCount API errors instead of `502`

No DB migration needed — `icount_docnum` column already exists and is writable by admins via the existing UPDATE RLS policy.

