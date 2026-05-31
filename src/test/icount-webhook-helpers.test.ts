import { describe, it, expect } from "vitest";
import {
  extractOrderId,
  isFailedPayment,
  isSuccessfulPayment,
  normalizeString,
  pickShineOnPrintUrl,
  FINALIZED_STATUSES,
  backoffMs,
  classifyShineOnFailure,
  SHINEON_MAX_RETRIES,
  resolveLineItemSku,
  buildShineonProperties,
} from "../../supabase/functions/icount-payment-webhook/helpers";

const ORDER_UUID = "11111111-1111-4111-8111-111111111111";

describe("normalizeString", () => {
  it("lowercases and trims strings", () => {
    expect(normalizeString("  Paid  ")).toBe("paid");
  });
  it("handles non-strings safely", () => {
    expect(normalizeString(null)).toBe("");
    expect(normalizeString(undefined)).toBe("");
    expect(normalizeString(42)).toBe("42");
  });
});

describe("isSuccessfulPayment / isFailedPayment", () => {
  it("recognizes common iCount success strings", () => {
    for (const status of ["success", "approved", "paid", "completed", "captured"]) {
      expect(isSuccessfulPayment({}, status)).toBe(true);
    }
  });
  it("recognizes boolean success flags", () => {
    expect(isSuccessfulPayment({ paid: true }, "")).toBe(true);
    expect(isSuccessfulPayment({ is_paid: true }, "")).toBe(true);
    expect(isSuccessfulPayment({ approved: true }, "")).toBe(true);
  });
  it("recognizes failure states", () => {
    for (const status of ["failed", "declined", "cancelled", "void"]) {
      expect(isFailedPayment({}, status)).toBe(true);
    }
    expect(isFailedPayment({ paid: false }, "")).toBe(true);
  });
  it("does not consider absence-of-failure as success", () => {
    expect(isSuccessfulPayment({}, "pending")).toBe(false);
    expect(isFailedPayment({}, "pending")).toBe(false);
  });
});

describe("extractOrderId", () => {
  it("pulls order UUID from common iCount payload fields", () => {
    expect(extractOrderId({ comment: ORDER_UUID })).toBe(ORDER_UUID);
    expect(extractOrderId({ custom: ORDER_UUID })).toBe(ORDER_UUID);
    expect(extractOrderId({ cs1: ORDER_UUID })).toBe(ORDER_UUID);
    expect(extractOrderId({ order_id: ORDER_UUID })).toBe(ORDER_UUID);
    expect(extractOrderId({ orderId: ORDER_UUID })).toBe(ORDER_UUID);
    expect(extractOrderId({ info: ORDER_UUID })).toBe(ORDER_UUID);
  });
  it("returns null for invalid/missing UUIDs", () => {
    expect(extractOrderId({ comment: "not-a-uuid" })).toBeNull();
    expect(extractOrderId({})).toBeNull();
    expect(extractOrderId({ comment: "" })).toBeNull();
  });
  it("trims whitespace around the UUID", () => {
    expect(extractOrderId({ comment: `   ${ORDER_UUID}   ` })).toBe(ORDER_UUID);
  });
});

describe("pickShineOnPrintUrl", () => {
  it("prefers the design_image_url SVG (the file ShineOn prints from) over the legacy PNG", () => {
    const r = pickShineOnPrintUrl({
      print_image_url: "https://cdn/example.png",
      design_image_url: "https://cdn/example.svg",
    });
    expect(r).toEqual({ url: "https://cdn/example.svg", source: "design_image_url" });
  });
  it("matches SVG urls even with a query string", () => {
    const r = pickShineOnPrintUrl({
      print_image_url: null,
      design_image_url: "https://cdn/design.svg?v=2",
    });
    expect(r).toEqual({ url: "https://cdn/design.svg?v=2", source: "design_image_url" });
  });
  it("falls back to print_image_url PNG when the SVG url is missing", () => {
    const r = pickShineOnPrintUrl({
      print_image_url: "https://cdn/example.png",
      design_image_url: null,
    });
    expect(r).toEqual({ url: "https://cdn/example.png", source: "print_image_url" });
  });
  it("uses a non-SVG design_image_url when nothing else is available", () => {
    const r = pickShineOnPrintUrl({
      print_image_url: "   ",
      design_image_url: "https://cdn/example.png",
    });
    expect(r).toEqual({ url: "https://cdn/example.png", source: "design_image_url" });
  });
  it("returns empty when neither is set", () => {
    expect(pickShineOnPrintUrl({})).toEqual({ url: "", source: "none" });
  });
});

describe("backoffMs (ShineOn retry schedule)", () => {
  it("grows across attempts then caps", () => {
    expect(backoffMs(0)).toBe(5 * 60_000);
    expect(backoffMs(1)).toBe(30 * 60_000);
    expect(backoffMs(2)).toBe(120 * 60_000);
  });
  it("caps at the last delay for attempts beyond the schedule", () => {
    expect(backoffMs(3)).toBe(120 * 60_000);
    expect(backoffMs(99)).toBe(120 * 60_000);
  });
  it("treats negative attempts as the first delay", () => {
    expect(backoffMs(-1)).toBe(5 * 60_000);
  });
  it("never schedules beyond the max retry count", () => {
    expect(SHINEON_MAX_RETRIES).toBe(3);
  });
});

describe("classifyShineOnFailure (transient vs permanent)", () => {
  it("treats 5xx, 429 and 408 as transient", () => {
    expect(classifyShineOnFailure(500, false)).toBe("transient");
    expect(classifyShineOnFailure(503, false)).toBe("transient");
    expect(classifyShineOnFailure(429, false)).toBe("transient");
    expect(classifyShineOnFailure(408, false)).toBe("transient");
  });
  it("treats thrown errors / no-status (network, timeout) as transient", () => {
    expect(classifyShineOnFailure(undefined, true)).toBe("transient");
    expect(classifyShineOnFailure(undefined, false)).toBe("transient");
  });
  it("treats other 4xx (validation, auth, conflict) as permanent", () => {
    expect(classifyShineOnFailure(400, false)).toBe("permanent");
    expect(classifyShineOnFailure(401, false)).toBe("permanent");
    expect(classifyShineOnFailure(409, false)).toBe("permanent");
    expect(classifyShineOnFailure(422, false)).toBe("permanent");
  });
});

describe("resolveLineItemSku (correct ShineOn variant)", () => {
  const FALLBACK = "SO-15845643";
  it("uses the per-order shineon_sku when present", () => {
    expect(resolveLineItemSku({ shineon_sku: "SO-15845644" }, FALLBACK)).toBe("SO-15845644");
  });
  it("falls back for legacy rows with no SKU", () => {
    expect(resolveLineItemSku({ shineon_sku: null }, FALLBACK)).toBe(FALLBACK);
    expect(resolveLineItemSku({}, FALLBACK)).toBe(FALLBACK);
  });
  it("treats a whitespace-only SKU as absent", () => {
    expect(resolveLineItemSku({ shineon_sku: "   " }, FALLBACK)).toBe(FALLBACK);
  });
});

describe("buildShineonProperties (correct item personalization)", () => {
  const PRINT = "https://cdn/design.svg";
  it("always includes the mandatory print_url", () => {
    expect(buildShineonProperties({}, PRINT)).toEqual({ print_url: PRINT });
  });
  it("adds the back engraving only when opted in AND a name exists", () => {
    expect(buildShineonProperties({ add_name_to_back: true, pet_name: "Rex" }, PRINT)).toEqual({
      print_url: PRINT,
      "Engraving Line 1": "Rex",
    });
  });
  it("omits engraving when not opted in (plain SKU variant)", () => {
    expect(buildShineonProperties({ add_name_to_back: false, pet_name: "Rex" }, PRINT)).toEqual({
      print_url: PRINT,
    });
  });
  it("omits engraving when opted in but the name is blank (never ships an engraved blank)", () => {
    expect(buildShineonProperties({ add_name_to_back: true, pet_name: "   " }, PRINT)).toEqual({
      print_url: PRINT,
    });
    expect(buildShineonProperties({ add_name_to_back: true, pet_name: null }, PRINT)).toEqual({
      print_url: PRINT,
    });
  });
  it("trims the engraved name", () => {
    expect(buildShineonProperties({ add_name_to_back: true, pet_name: "  Bella  " }, PRINT))
      .toEqual({ print_url: PRINT, "Engraving Line 1": "Bella" });
  });
});

describe("FINALIZED_STATUSES (idempotency guard)", () => {
  it("treats paid/fulfilled/shineon_error as finalized", () => {
    expect(FINALIZED_STATUSES.has("paid")).toBe(true);
    expect(FINALIZED_STATUSES.has("fulfilled")).toBe(true);
    expect(FINALIZED_STATUSES.has("shineon_error")).toBe(true);
  });
  it("does NOT treat in-progress states as finalized (allowing the first webhook through)", () => {
    expect(FINALIZED_STATUSES.has("pending")).toBe(false);
    expect(FINALIZED_STATUSES.has("payment_pending")).toBe(false);
    expect(FINALIZED_STATUSES.has("shipping_captured")).toBe(false);
  });
});
