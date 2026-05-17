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
 * Priority:
 *   1. print_image_url  — always a rendered PNG from upload-production-assets.
 *   2. design_image_url — raster PNG only; SVG values are hard-blocked because
 *      ShineOn cannot process vector files and produces a blank print.
 *   3. none             — caller must treat this as a hard error and mark the
 *      order as shineon_error rather than submitting a broken payload.
 */
export function pickShineOnPrintUrl(order: {
  print_image_url?: string | null;
  design_image_url?: string | null;
}): { url: string; source: "print_image_url" | "design_image_url" | "none" } {
  const printUrl = order.print_image_url?.trim() || "";
  if (printUrl) {
    return { url: printUrl, source: "print_image_url" };
  }
  const fallback = order.design_image_url?.trim() || "";
  if (fallback && !isSvgUrl(fallback)) {
    return { url: fallback, source: "design_image_url" };
  }
  return { url: "", source: "none" };
}
