// Pure helpers for the iCount payment webhook.
// No Deno imports here — must remain importable from both Deno (the edge function)
// and Node/Vitest (unit tests).

export const SUCCESS_STATUSES = new Set([
  "success",
  "approved",
  "paid",
  "completed",
  "complete",
  "authorized",
  "captured",
]);

export const FAILURE_STATUSES = new Set([
  "failed",
  "failure",
  "declined",
  "cancelled",
  "canceled",
  "error",
  "void",
]);

export const FINALIZED_STATUSES = new Set(["paid", "fulfilled", "shineon_error"]);

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : value == null
      ? ""
      : String(value).trim().toLowerCase();
}

export function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return null;
}

export function isSuccessfulPayment(body: any, paymentStatus: string): boolean {
  return (
    SUCCESS_STATUSES.has(paymentStatus) ||
    body?.is_paid === true ||
    body?.paid === true ||
    body?.success === true ||
    body?.approved === true
  );
}

export function isFailedPayment(body: any, paymentStatus: string): boolean {
  return (
    FAILURE_STATUSES.has(paymentStatus) ||
    body?.is_paid === false ||
    body?.paid === false ||
    body?.success === false
  );
}

export function extractOrderId(body: any): string | null {
  const candidates = [body?.comment, body?.custom, body?.cs1, body?.order_id, body?.orderId, body?.info];
  for (const candidate of candidates) {
    const value =
      typeof candidate === "string" ? candidate.trim() : String(candidate || "").trim();
    if (UUID_RE.test(value)) return value;
  }
  return null;
}

// ── ShineOn auto-retry policy ───────────────────────────────────────
// Transient failures (network/timeout, 408/429/5xx) are retried on a backoff
// schedule by the shineon-retry-sweep cron. Permanent failures (other 4xx,
// missing print asset) are NOT auto-retried — they surface in the admin
// "Needs Attention" view for manual handling.

export const SHINEON_MAX_RETRIES = 3;

/** Backoff schedule between ShineOn retry attempts, in milliseconds. */
const SHINEON_BACKOFF_MS = [5 * 60_000, 30 * 60_000, 120 * 60_000];

/** Delay before the next retry given how many attempts have already happened. */
export function backoffMs(attempt: number): number {
  const i = attempt < 0 ? 0 : Math.min(attempt, SHINEON_BACKOFF_MS.length - 1);
  return SHINEON_BACKOFF_MS[i];
}

/**
 * Classify a ShineOn submission failure.
 *  - transient: a thrown error (network/timeout) or HTTP 408 / 429 / 5xx
 *  - permanent: any other 4xx (validation, auth, conflict)
 */
export function classifyShineOnFailure(
  status: number | undefined,
  threw: boolean,
): "transient" | "permanent" {
  if (threw) return "transient";
  if (status === undefined) return "transient";
  if (status === 408 || status === 429 || status >= 500) return "transient";
  return "permanent";
}

// ── ShineOn line-item construction ("the correct item") ─────────────
// The variant SKU is resolved at checkout (finish × back engraving) and stored
// on the order. These helpers turn an order row into the exact ShineOn line item
// so the "correct item" logic is unit-tested instead of living inline in the
// request handler.

/**
 * The ShineOn SKU to submit for an order. Prefers the per-order variant SKU
 * resolved at checkout; falls back for legacy rows created before the
 * shineon_sku column existed. Whitespace-only SKUs are treated as absent.
 */
export function resolveLineItemSku(
  order: { shineon_sku?: string | null },
  fallbackSku: string,
): string {
  const sku = order.shineon_sku?.trim();
  return sku ? sku : fallbackSku;
}

/**
 * ShineOn line_item.properties for an order. The front soundwave (print_url) is
 * mandatory. The back engraving (the name) is sent ONLY when the buyer opted in
 * via add_name_to_back AND a name is present — keeping it consistent with the
 * engraved-vs-plain SKU variant so an engraved item never ships blank.
 */
export function buildShineonProperties(
  order: { add_name_to_back?: boolean | null; pet_name?: string | null },
  printUrl: string,
): Record<string, string> {
  const properties: Record<string, string> = { print_url: printUrl };
  const name = order.pet_name?.toString().trim();
  if (order.add_name_to_back && name) {
    properties["Engraving Line 1"] = name;
  }
  return properties;
}

/** Returns true for any URL that points to an unrendered SVG file. */
function isSvgUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".svg") ||
    lower.includes(".svg?") ||
    lower.includes(".svg#")
  );
}

/**
 * Decide which asset URL to send to ShineOn as `print_url`.
 *
 * ShineOn's Acrylic dog-tag template requires a 1000x1788 SVG (RGB, solid black) —
 * confirmed with the client. The vector SVG is the file ShineOn prints from.
 *
 * Priority:
 *   1. design_image_url — the production SVG (final_engraving_design.svg).
 *   2. print_image_url  — legacy rasterized PNG, kept only as a fallback so an
 *      order never hard-fails if the SVG url is somehow missing.
 *   3. none             — caller marks the order shineon_error rather than
 *      submitting a broken payload.
 */
export function pickShineOnPrintUrl(order: {
  print_image_url?: string | null;
  design_image_url?: string | null;
}): { url: string; source: "design_image_url" | "print_image_url" | "none" } {
  const svgUrl = order.design_image_url?.trim() || "";
  if (svgUrl && isSvgUrl(svgUrl)) {
    return { url: svgUrl, source: "design_image_url" };
  }
  const printUrl = order.print_image_url?.trim() || "";
  if (printUrl) {
    return { url: printUrl, source: "print_image_url" };
  }
  if (svgUrl) {
    return { url: svgUrl, source: "design_image_url" };
  }
  return { url: "", source: "none" };
}
