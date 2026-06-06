// Pure helpers for the iCount payment webhook.
// No Deno imports here - must remain importable from both Deno (the edge function)
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
// Unanchored variant for finding a UUID embedded inside a larger string.
export const UUID_SEARCH_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

// Document types iCount issues only AFTER money is received. Their presence in a
// webhook is itself the "payment succeeded" signal - the document webhook carries
// no `status` field, so doctype is what we key on.
export const PAID_DOCTYPES = new Set(["receipt", "invrec"]);

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
  if (!body || typeof body !== "object") return null;

  // 1. Known reference fields, expected to hold the bare order UUID.
  //    Covers both the cc_page IPN shape (comment/cs1/custom/info) and the
  //    document webhook shape (safety_issue_field round-trips per-page data).
  const known = [
    body.comment,
    body.cs1,
    body.cs2,
    body.cs3,
    body.order_id,
    body.orderId,
    body.info,
    body.safety_issue_field,
  ];
  for (const candidate of known) {
    const value =
      typeof candidate === "string" ? candidate.trim() : String(candidate ?? "").trim();
    if (UUID_RE.test(value)) return value;
  }

  // 2. `custom` is a string in the cc_page IPN but an object in the document
  //    webhook ({cc_page_id, ...}). Check either shape for an embedded UUID.
  if (typeof body.custom === "string") {
    const value = body.custom.trim();
    if (UUID_RE.test(value)) return value;
  } else if (body.custom && typeof body.custom === "object") {
    for (const val of Object.values(body.custom)) {
      const value = typeof val === "string" ? val.trim() : String(val ?? "").trim();
      if (UUID_RE.test(value)) return value;
    }
  }

  // 3. Last resort: scan every top-level string value for an embedded UUID.
  //    The iCount page reference (e.g. "c693586ep3u6...") is not a valid UUID,
  //    so it can't false-match here.
  for (const val of Object.values(body)) {
    if (typeof val === "string") {
      const match = val.match(UUID_SEARCH_RE);
      if (match) return match[0];
    }
  }

  return null;
}

/**
 * True when the webhook payload is a document that iCount only issues after
 * payment is received (a receipt or invoice-receipt). The document webhook has
 * no `status` field, so the document's existence IS the success signal. A plain
 * invoice ("inv") is excluded - it can be issued before payment.
 */
export function isPaidDocument(body: any): boolean {
  return PAID_DOCTYPES.has(normalizeString(body?.doctype));
}

/**
 * iCount's document webhook may arrive as a single object OR as a one-element
 * array `[ { ... } ]` (per the iCount docs example). Normalize to the document
 * object; anything unusable becomes an empty object so downstream reads are safe.
 */
export function unwrapWebhookBody(parsed: unknown): any {
  if (Array.isArray(parsed)) {
    const first = parsed[0];
    return first && typeof first === "object" ? first : {};
  }
  if (parsed && typeof parsed === "object") return parsed;
  return {};
}

/** The iCount document number (invoice/receipt), checked across field aliases. */
export function extractDocnum(body: any): string | null {
  return firstString(
    body?.docnum,
    body?.doc_number,
    body?.receiptnumber,
    body?.inv_rec_number,
    body?.invoice_number,
    body?.document_number,
  );
}

/**
 * Customer email, normalized. In the document webhook it is nested under
 * `client.email`; the cc_page IPN shape carries it at the top level.
 */
export function extractCustomerEmail(body: any): string {
  return normalizeString(
    body?.client?.email || body?.client_email || body?.email || body?.customer_email,
  );
}

/**
 * Candidate strings that could equal the `sale_uniqid` we stored on the order at
 * checkout, so the webhook can match this exact payment to its order. The document
 * webhook does not echo a labelled `sale_uniqid` field, so we gather the likely
 * carriers: explicit sale fields, plus `safety_issue_field` and its dash-separated
 * parts (it holds the page token + per-sale token, e.g. "<page>-<saleToken>").
 */
export function saleRefCandidates(body: any): string[] {
  if (!body || typeof body !== "object") return [];
  const raw: unknown[] = [body.sale_uniqid, body.sale_sid];
  const sif = typeof body.safety_issue_field === "string" ? body.safety_issue_field.trim() : "";
  if (sif) {
    raw.push(sif, ...sif.split("-"));
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/**
 * Email-based fallback matching, WITHOUT guessing. When the webhook carries no
 * order reference we can only match on the customer email - but picking the
 * "most recent" order silently mis-routes fulfillment when the same email has
 * two concurrent orders (a real risk). So:
 * - 0 candidates           → no match
 * - exactly 1 candidate    → confident match
 * - many, unique amount    → match the single amount hit
 * - many, amount ties/none → AMBIGUOUS: refuse to pick (flag for manual review)
 * Fulfilling the wrong design is worse than stalling an order for a human to look at.
 */
export function selectByEmailAndAmount<T extends { amount?: number | string | null }>(
  rows: T[],
  webhookAmount: unknown,
): { order: T | null; reason: string; ambiguous: boolean } {
  if (!rows || rows.length === 0) {
    return { order: null, reason: "no_email_match", ambiguous: false };
  }
  if (rows.length === 1) {
    return { order: rows[0], reason: "matched_email_single", ambiguous: false };
  }
  const amount = Number(webhookAmount);
  if (Number.isFinite(amount) && String(webhookAmount).trim() !== "") {
    const matches = rows.filter((r) => Number(r.amount) === amount);
    if (matches.length === 1) {
      return { order: matches[0], reason: "matched_email_amount", ambiguous: false };
    }
  }
  // Multiple candidates and the amount can't single one out → do not guess.
  return { order: null, reason: "ambiguous_email_match", ambiguous: true };
}

// ── ShineOn auto-retry policy ───────────────────────────────────────
// Transient failures (network/timeout, 408/429/5xx) are retried on a backoff
// schedule by the shineon-retry-sweep cron. Permanent failures (other 4xx,
// missing print asset) are NOT auto-retried - they surface in the admin
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
 * - transient: a thrown error (network/timeout) or HTTP 408 / 429 / 5xx
 * - permanent: any other 4xx (validation, auth, conflict)
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

// The 4 ShineOn variant SKUs for "The ANIMUS Soulwave Pendant" (finish × engraving).
// Mirror of shineonSkus in src/config/product.ts - kept in sync.
export const SHINEON_SKUS = {
  steel: { engraved: "SO-15845643", plain: "SO-15845642" },
  gold: { engraved: "SO-15845645", plain: "SO-15845644" },
} as const;

/**
 * The ShineOn SKU to submit for an order, derived purely from the order's chosen
 * finish (variant_finish) and back engraving (add_name_to_back). The SKU is not
 * stored - it is a pure function of these two inputs, so there is one source of
 * truth and nothing to keep in sync. Unknown finish defaults to steel.
 */
export function resolveLineItemSku(
  order: { variant_finish?: string | null; add_name_to_back?: boolean | null },
  skus: typeof SHINEON_SKUS = SHINEON_SKUS,
): string {
  const finish = order.variant_finish === "gold" ? "gold" : "steel";
  const set = skus[finish];
  return order.add_name_to_back ? set.engraved : set.plain;
}

/**
 * ShineOn line_item.properties for an order. The front soundwave (print_url) is
 * mandatory. The back engraving (the name) is sent ONLY when the buyer opted in
 * via add_name_to_back AND a name is present - keeping it consistent with the
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

/**
 * True when an order opted into back engraving (add_name_to_back) but has no
 * engraving text. The SKU would be the engraved variant yet ship blank, so the
 * webhook must reject this rather than submit an inconsistent order. Mirrors the
 * frontend's checkout validation as a backend safety net.
 */
export function engravingTextMissing(order: {
  add_name_to_back?: boolean | null;
  pet_name?: string | null;
}): boolean {
  if (!order.add_name_to_back) return false;
  return !order.pet_name?.toString().trim();
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
 * ShineOn's Acrylic dog-tag template prints ONLY from a 1000x1788 SVG (RGB, solid
 * black) - confirmed with the client. A PNG (or any non-SVG) is rejected by ShineOn
 * with a 406 ("requires svg"), so there is no useful fallback: if the production SVG
 * (design_image_url) is missing, we return "none" and the caller marks the order
 * shineon_error rather than submitting a payload that is guaranteed to bounce.
 *
 * print_image_url (the legacy rasterized PNG) is intentionally ignored.
 */
export function pickShineOnPrintUrl(order: {
  print_image_url?: string | null;
  design_image_url?: string | null;
}): { url: string; source: "design_image_url" | "none" } {
  const svgUrl = order.design_image_url?.trim() || "";
  if (svgUrl && isSvgUrl(svgUrl)) {
    return { url: svgUrl, source: "design_image_url" };
  }
  return { url: "", source: "none" };
}
