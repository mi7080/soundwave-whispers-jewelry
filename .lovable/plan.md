
## The bug

The "Export Daily Batch for ShineOn" button is **disabled and does nothing** because the filter doesn't match any orders.

**Current filter** (`AdminOrders.tsx` line 193 + 284):
```ts
orders.filter(o => o.workflow_status === "paid" && ...)
```

**Reality from your DB** (both existing orders):
- `workflow_status: "new"`
- `fulfillment_status: "paid"`

So `paidPending` is always `0` → button shows "(0)", is disabled, click does nothing.

There are two separate fields that got conflated:
- `fulfillment_status` — set to `"paid"` by the iCount webhook when payment succeeds
- `workflow_status` — internal pipeline (`new` → `sent_to_production` → `shipped`)

The export was wired to the wrong one.

## Fix

**File: `src/pages/AdminOrders.tsx`** — two small changes:

1. **Eligibility filter** (used for both `paidPending` count and `exportShineOnBatch`):
   Replace `o.workflow_status === "paid"` with the real "Art Ready" definition:
   ```ts
   const isArtReady = (o: Order) =>
     o.fulfillment_status === "paid" &&
     o.workflow_status !== "sent_to_production" &&
     o.workflow_status !== "shipped" &&
     !!o.svg_content && o.svg_content.trim() !== "<svg></svg>";
   ```
   Apply in `paidPending` (line 284) and `exportShineOnBatch`'s `batch` (line 193).

2. **Add `fulfillment_status` to the `Order` interface** (line 16-39) so TS allows the check.

3. **Empty-SVG guard before render loop** (line 206-213): skip orders whose `svg_content` is the `<svg></svg>` placeholder — they'll 500 the renderer (already happened to "Memorial"). Surface them as an inline warning instead of blocking the whole export.

4. **Button label**: rename "Export Daily Batch for ShineOn (N)" — N now reflects Art Ready orders within the date range.

## Why the data looks this way

The iCount webhook writes `fulfillment_status='paid'` but leaves `workflow_status` at its default `'new'`. Nothing in the app promotes `new → paid`, so the old check could never be true.

After the fix, the JUDI order (valid SVG, `fulfillment_status='paid'`) will show up in the count and export cleanly. Memorial will be flagged as "missing design" until the customer completes the flow.

## No DB / migration changes needed.
