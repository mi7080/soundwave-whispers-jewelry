// Pure helpers for the ShineOn shipment-notification receiver.
// No Deno imports - importable from both Deno (the edge function) and Vitest.
//
// NOTE: ShineOn's exact callback shape is not documented to us yet, so the
// extractors are deliberately tolerant (multiple field-name aliases, nested
// `order`, array wrapper). The function logs the raw payload so the real shape
// can be confirmed from the first live shipment and these tightened if needed.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function firstNonEmpty(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

/** ShineOn may POST the order nested under `order`, as a bare object, or as a one-element array. */
export function unwrapShineonBody(parsed: unknown): any {
  let body: any = parsed;
  if (Array.isArray(body)) body = body[0];
  if (!body || typeof body !== "object") return {};
  if (body.order && typeof body.order === "object") return body.order;
  return body;
}

/**
 * Our `source_id` (= iCount docnum, or `icount-<orderId>`) as echoed by ShineOn.
 * Checked at the top level, under a nested `order`, common aliases, and finally
 * derived from a line item's `store_line_item_id` (which we set as `<source>-1`).
 */
export function extractShineonSourceId(body: any): string | null {
  if (!body || typeof body !== "object") return null;
  const order = body.order && typeof body.order === "object" ? body.order : body;
  const direct = firstNonEmpty(
    order.source_id,
    body.source_id,
    order.store_order_id,
    body.store_order_id,
    order.external_id,
    body.external_id,
  );
  if (direct) return direct;

  const items = order.line_items || body.line_items;
  if (Array.isArray(items)) {
    for (const li of items) {
      const sli = firstNonEmpty(li?.store_line_item_id);
      if (sli) return sli.replace(/-\d+$/, "");
    }
  }
  return null;
}

/**
 * ShineOn's OWN order id - the unprefixed `id` on their order object (and line
 * items). We capture this at submit time onto `animus_orders.shineon_order_id`,
 * so it's the most reliable callback match key: always present in their payload,
 * and immune to the source_id / store_order_id aliasing. Returned as a string.
 */
export function extractShineonOrderId(body: any): string | null {
  if (!body || typeof body !== "object") return null;
  const order = body.order && typeof body.order === "object" ? body.order : body;
  return firstNonEmpty(order.id, body.id);
}

/** If the source id is `icount-<uuid>`, return the order UUID; otherwise null (match by docnum). */
export function sourceIdToOrderId(sourceId: string | null): string | null {
  if (!sourceId) return null;
  const m = sourceId.match(UUID_RE);
  return m ? m[0] : null;
}

/**
 * Tracking number / url / carrier.
 *
 * ShineOn's documented callback nests tracking INSIDE each line item, under
 * `tracking_number` and `tracking_company` (no tracking_url is sent):
 *   { order: { line_items: [{ tracking_number, tracking_company }] } }
 * We read the first line item that carries a tracking number, then fall back to
 * order-root / camelCase aliases for tolerance.
 */
export function extractTracking(body: any): {
  number: string | null;
  url: string | null;
  carrier: string | null;
} {
  const order = body?.order && typeof body.order === "object" ? body.order : (body || {});
  const tracking = order.tracking && typeof order.tracking === "object" ? order.tracking : {};
  const items = Array.isArray(order.line_items) ? order.line_items
    : Array.isArray(body?.line_items) ? body.line_items : [];
  const li = items.find(
    (x: any) => x && firstNonEmpty(x.tracking_number, x.trackingNumber, x.tracking_no),
  ) || {};
  return {
    number: firstNonEmpty(
      li.tracking_number, li.trackingNumber, li.tracking_no,
      order.tracking_number, order.trackingNumber, order.tracking_no,
      tracking.number, body?.tracking_number, body?.trackingNumber,
    ),
    url: firstNonEmpty(
      li.tracking_url, li.trackingUrl,
      order.tracking_url, order.trackingUrl, tracking.url,
      body?.tracking_url, body?.trackingUrl,
    ),
    carrier: firstNonEmpty(
      li.tracking_company, li.tracking_carrier, li.carrier,
      order.tracking_company, order.carrier, order.shipping_carrier, order.tracking_carrier,
      tracking.carrier, body?.carrier, body?.shipping_carrier,
    ),
  };
}

/**
 * ShineOn sends a tracking number + carrier name but no tracking URL. We hand the
 * customer a carrier-agnostic aggregator link (Parcels App) that auto-detects the
 * carrier from the number - no per-carrier URL map to maintain. Returns null when
 * there's no number to track.
 */
export function aggregatorTrackingUrl(number: string | null | undefined): string | null {
  const n = firstNonEmpty(number);
  return n ? `https://parcelsapp.com/en/tracking/${encodeURIComponent(n)}` : null;
}
