/**
 * Meta Pixel (fbq) event helpers.
 *
 * The base pixel + `PageView` are bootstrapped in index.html (fbq init). This
 * module only fires the commerce funnel events on top of that. Purchase is fired
 * client-side on the thank-you page for now; `eventID` is set to the order id so a
 * future server-side Conversions API Purchase deduplicates against it.
 */
import { PRODUCT_CONFIG } from "@/config/product";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Single-product store: every event references the one pendant. Matches the
// hardcoded product id used in ProductSection.
const CONTENT_ID = "animus-pendant";

export type PixelParams = Record<string, unknown>;

/** Standard content + monetary params shared by every commerce event. */
export function contentParams(value: number = PRODUCT_CONFIG.foundersPrice): PixelParams {
  return {
    content_ids: [CONTENT_ID],
    content_name: PRODUCT_CONFIG.title,
    content_type: "product",
    value,
    currency: PRODUCT_CONFIG.currency,
  };
}

/** Fire a standard Pixel event if fbq is loaded. `eventID` enables CAPI dedup. */
export function track(event: string, params?: PixelParams, eventID?: string): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventID) window.fbq("track", event, params ?? {}, { eventID });
  else window.fbq("track", event, params ?? {});
}

/**
 * Run `fn` at most once per key, persisted in sessionStorage, so React remounts,
 * status-poll re-renders, and page refreshes don't double-count events. If
 * sessionStorage is unavailable (private mode), the event still fires.
 */
export function fireOnce(key: string, fn: () => void): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    }
  } catch {
    /* sessionStorage blocked - fall through and fire anyway */
  }
  fn();
}

export function trackViewContent(): void {
  fireOnce("px:viewcontent", () => track("ViewContent", contentParams()));
}

export function trackInitiateCheckout(orderId?: string, value?: number): void {
  fireOnce(`px:initiatecheckout:${orderId ?? "anon"}`, () =>
    track("InitiateCheckout", contentParams(value))
  );
}

export function trackAddPaymentInfo(orderId?: string, value?: number): void {
  fireOnce(`px:addpaymentinfo:${orderId ?? "anon"}`, () =>
    track("AddPaymentInfo", contentParams(value))
  );
}

/** Purchase. eventID = order id so a later server-side CAPI Purchase dedupes. */
export function trackPurchase(orderId: string, value: number): void {
  fireOnce(`px:purchase:${orderId}`, () =>
    track("Purchase", { ...contentParams(value), num_items: 1 }, orderId)
  );
}
