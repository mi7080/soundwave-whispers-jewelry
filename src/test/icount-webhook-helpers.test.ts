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
  engravingTextMissing,
  unwrapWebhookBody,
  isPaidDocument,
  extractDocnum,
  extractCustomerEmail,
  selectByEmailAndAmount,
  saleRefCandidates,
} from "../../supabase/functions/icount-payment-webhook/helpers";

const ORDER_UUID = "11111111-1111-4111-8111-111111111111";

// A real iCount receipt webhook payload (trimmed) - the shape iCount actually
// POSTs on document issuance: a single object with doctype/docnum/client, NO
// status field, NO cs1. Used to lock the document-webhook parsing behavior.
const RECEIPT_PAYLOAD = {
  doctype: "receipt",
  docnum: "1003",
  receiptnumber: "1003",
  comment: "",
  custom: { cc_page_id: "3" },
  safety_issue_field: "c693586ep3u6a1f25cd-csodvig0s0",
  clientName: "Adir Yadaev",
  client: { email: "adir.yed@gmail.com", phone: "9720525540805" },
  items: [{ description: "The ANIMUS Soulwave Pendant", sku: "" }],
};

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

describe("unwrapWebhookBody (document webhook may be array OR object)", () => {
  it("returns the first element when iCount sends an array", () => {
    expect(unwrapWebhookBody([RECEIPT_PAYLOAD])).toBe(RECEIPT_PAYLOAD);
  });
  it("returns the object unchanged when iCount sends a bare object", () => {
    expect(unwrapWebhookBody(RECEIPT_PAYLOAD)).toBe(RECEIPT_PAYLOAD);
  });
  it("returns an empty object for empty array / null / non-objects", () => {
    expect(unwrapWebhookBody([])).toEqual({});
    expect(unwrapWebhookBody(null)).toEqual({});
    expect(unwrapWebhookBody(undefined)).toEqual({});
    expect(unwrapWebhookBody("oops")).toEqual({});
  });
});

describe("isPaidDocument (issuance of a receipt/invrec means money received)", () => {
  it("treats a receipt as paid", () => {
    expect(isPaidDocument({ doctype: "receipt" })).toBe(true);
  });
  it("treats an invoice-receipt (invrec) as paid", () => {
    expect(isPaidDocument({ doctype: "invrec" })).toBe(true);
  });
  it("does NOT treat a plain invoice (inv) as paid - it can be unpaid", () => {
    expect(isPaidDocument({ doctype: "inv" })).toBe(false);
  });
  it("does NOT treat non-payment documents as paid", () => {
    expect(isPaidDocument({ doctype: "offer" })).toBe(false);
    expect(isPaidDocument({ doctype: "deal" })).toBe(false);
    expect(isPaidDocument({})).toBe(false);
  });
  it("is case-insensitive on doctype", () => {
    expect(isPaidDocument({ doctype: "RECEIPT" })).toBe(true);
  });
});

describe("extractDocnum (the iCount invoice/receipt number)", () => {
  it("reads docnum from the receipt payload", () => {
    expect(extractDocnum(RECEIPT_PAYLOAD)).toBe("1003");
  });
  it("falls back to receiptnumber / inv_rec_number / document_number", () => {
    expect(extractDocnum({ receiptnumber: "55" })).toBe("55");
    expect(extractDocnum({ inv_rec_number: "77" })).toBe("77");
    expect(extractDocnum({ document_number: "88" })).toBe("88");
  });
  it("returns null when no document number is present", () => {
    expect(extractDocnum({})).toBeNull();
  });
});

describe("extractCustomerEmail (nested under client in the document webhook)", () => {
  it("reads the email from the nested client object", () => {
    expect(extractCustomerEmail(RECEIPT_PAYLOAD)).toBe("adir.yed@gmail.com");
  });
  it("falls back to top-level email fields (cc_page IPN shape)", () => {
    expect(extractCustomerEmail({ client_email: "A@B.com" })).toBe("a@b.com");
    expect(extractCustomerEmail({ email: "C@D.com" })).toBe("c@d.com");
  });
  it("returns empty string when no email is present", () => {
    expect(extractCustomerEmail({})).toBe("");
    expect(extractCustomerEmail(RECEIPT_PAYLOAD === RECEIPT_PAYLOAD ? { client: {} } : {})).toBe("");
  });
});

describe("extractOrderId - document webhook fields", () => {
  it("finds the order UUID in safety_issue_field (a field iCount round-trips)", () => {
    expect(extractOrderId({ safety_issue_field: ORDER_UUID })).toBe(ORDER_UUID);
  });
  it("finds the order UUID nested inside the custom object", () => {
    expect(extractOrderId({ custom: { order_id: ORDER_UUID, cc_page_id: "3" } })).toBe(ORDER_UUID);
  });
  it("finds the order UUID anywhere in a top-level string field as a last resort", () => {
    expect(extractOrderId({ writtencomment: `order ${ORDER_UUID}` })).toBe(ORDER_UUID);
  });
  it("does NOT mistake the iCount page reference for an order id", () => {
    expect(extractOrderId(RECEIPT_PAYLOAD)).toBeNull();
  });
  it("finds the order UUID in the paypage IPN's echoed utm_content field", () => {
    // Real paypage IPN shape - no sale_uniqid/cs1, but utm_content echoes back
    // whatever we sent to generate_sale, so we stash the order UUID there.
    const ipn = {
      cp: "3",
      doctype: "receipt",
      docnum: "1011",
      customer_email: "adir.yed@gmail.com",
      total_paid: "0",
      utm_source: "iCount",
      utm_medium: "paypage",
      utm_campaign: "3",
      utm_content: ORDER_UUID,
      utm_term: ORDER_UUID,
    };
    expect(extractOrderId(ipn)).toBe(ORDER_UUID);
  });
});

describe("saleRefCandidates (link a webhook back to its stored sale_uniqid)", () => {
  it("includes the explicit sale fields when present", () => {
    const c = saleRefCandidates({ sale_uniqid: "ABC123", sale_sid: "SID999" });
    expect(c).toContain("ABC123");
    expect(c).toContain("SID999");
  });
  it("includes safety_issue_field and its dash-separated parts (page token / sale token)", () => {
    const c = saleRefCandidates({ safety_issue_field: "c693586ep3u69dfd9dd-vq9qd5pp3s" });
    expect(c).toContain("c693586ep3u69dfd9dd-vq9qd5pp3s");
    expect(c).toContain("c693586ep3u69dfd9dd");
    expect(c).toContain("vq9qd5pp3s");
  });
  it("dedupes and drops empties", () => {
    const c = saleRefCandidates({ sale_uniqid: "X", sale_sid: "X", safety_issue_field: "" });
    expect(c).toEqual(["X"]);
  });
  it("returns an empty array when nothing usable is present", () => {
    expect(saleRefCandidates({})).toEqual([]);
    expect(saleRefCandidates(null)).toEqual([]);
  });
});

describe("selectByEmailAndAmount (no-guess email fallback)", () => {
  const A = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", amount: 89 };
  const B = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", amount: 89 };
  const C = { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", amount: 129 };

  it("returns no match when there are no candidate orders", () => {
    const r = selectByEmailAndAmount([], 89);
    expect(r.order).toBeNull();
    expect(r.ambiguous).toBe(false);
  });
  it("matches confidently when the email maps to exactly one order", () => {
    const r = selectByEmailAndAmount([A], 89);
    expect(r.order).toBe(A);
    expect(r.ambiguous).toBe(false);
  });
  it("disambiguates multiple orders by a unique amount", () => {
    const r = selectByEmailAndAmount([A, C], 129);
    expect(r.order).toBe(C);
    expect(r.ambiguous).toBe(false);
  });
  it("refuses to guess when two orders share the same email AND amount", () => {
    const r = selectByEmailAndAmount([A, B], 89);
    expect(r.order).toBeNull();
    expect(r.ambiguous).toBe(true);
  });
  it("refuses to guess when the amount matches none of several candidates", () => {
    const r = selectByEmailAndAmount([A, C], 999);
    expect(r.order).toBeNull();
    expect(r.ambiguous).toBe(true);
  });
  it("refuses to guess across multiple candidates when the amount is not a usable number", () => {
    const r = selectByEmailAndAmount([A, B], "");
    expect(r.order).toBeNull();
    expect(r.ambiguous).toBe(true);
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
  it("does NOT fall back to the PNG - template requires SVG, so a PNG-only order is 'none'", () => {
    const r = pickShineOnPrintUrl({
      print_image_url: "https://cdn/example.png",
      design_image_url: null,
    });
    expect(r).toEqual({ url: "", source: "none" });
  });
  it("rejects a non-SVG design_image_url (PNG would 406 at ShineOn)", () => {
    const r = pickShineOnPrintUrl({
      print_image_url: "   ",
      design_image_url: "https://cdn/example.png",
    });
    expect(r).toEqual({ url: "", source: "none" });
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

describe("engravingTextMissing (backend validation)", () => {
  it("is false when engraving is off (text not required)", () => {
    expect(engravingTextMissing({ add_name_to_back: false, pet_name: "" })).toBe(false);
    expect(engravingTextMissing({ add_name_to_back: null })).toBe(false);
  });
  it("is true when engraving is on but text is blank or whitespace", () => {
    expect(engravingTextMissing({ add_name_to_back: true, pet_name: "" })).toBe(true);
    expect(engravingTextMissing({ add_name_to_back: true, pet_name: "   " })).toBe(true);
    expect(engravingTextMissing({ add_name_to_back: true, pet_name: null })).toBe(true);
  });
  it("is false when engraving is on and text is present", () => {
    expect(engravingTextMissing({ add_name_to_back: true, pet_name: "Buddy" })).toBe(false);
  });
});

describe("resolveLineItemSku (derived from finish × engraving)", () => {
  it("resolves GOLD from variant_finish - never defaults to steel", () => {
    expect(resolveLineItemSku({ variant_finish: "gold", add_name_to_back: false })).toBe("SO-15845644");
    expect(resolveLineItemSku({ variant_finish: "gold", add_name_to_back: true })).toBe("SO-15845645");
  });
  it("resolves STEEL by finish + engraving", () => {
    expect(resolveLineItemSku({ variant_finish: "steel", add_name_to_back: false })).toBe("SO-15845642");
    expect(resolveLineItemSku({ variant_finish: "steel", add_name_to_back: true })).toBe("SO-15845643");
  });
  it("defaults to steel when finish is unknown, still honouring engraving", () => {
    expect(resolveLineItemSku({})).toBe("SO-15845642");
    expect(resolveLineItemSku({ add_name_to_back: true })).toBe("SO-15845643");
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
