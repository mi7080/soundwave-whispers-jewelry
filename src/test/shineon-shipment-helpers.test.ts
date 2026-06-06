import { describe, it, expect } from "vitest";
import {
  unwrapShineonBody,
  extractShineonOrderId,
  extractShineonSourceId,
  sourceIdToOrderId,
  extractTracking,
  aggregatorTrackingUrl,
} from "../../supabase/functions/shineon-shipment-notification/helpers";

const ORDER_UUID = "11111111-1111-4111-8111-111111111111";

// ShineOn's documented shipment-notification callback shape (Orders API wiki).
// Tracking is nested inside line_items; source_id comes back EMPTY, our ref is
// echoed under store_order_id / store_line_item_id; `id` is ShineOn's own.
const SHINEON_CALLBACK = {
  order: {
    id: 20039,
    source_id: "",
    store_order_id: "1011",
    line_items: [
      {
        id: 20039,
        store_line_item_id: "1011-1",
        sku: "SO-15845642",
        quantity: 1,
        tracking_company: "USPS",
        tracking_number: "9400110200881958183792",
      },
    ],
  },
};

describe("unwrapShineonBody", () => {
  it("returns the order object when nested under `order`", () => {
    const o = { source_id: "1011" };
    expect(unwrapShineonBody({ order: o })).toBe(o);
  });
  it("returns the first element of an array", () => {
    const o = { source_id: "1011" };
    expect(unwrapShineonBody([o])).toBe(o);
  });
  it("returns a bare object unchanged", () => {
    const o = { source_id: "1011" };
    expect(unwrapShineonBody(o)).toBe(o);
  });
  it("returns {} for null / non-objects", () => {
    expect(unwrapShineonBody(null)).toEqual({});
    expect(unwrapShineonBody("x")).toEqual({});
  });
});

describe("extractShineonSourceId", () => {
  it("reads source_id from the top level", () => {
    expect(extractShineonSourceId({ source_id: "1011" })).toBe("1011");
  });
  it("reads it from a nested order object", () => {
    expect(extractShineonSourceId({ order: { source_id: "icount-" + ORDER_UUID } })).toBe("icount-" + ORDER_UUID);
  });
  it("falls back to common aliases", () => {
    expect(extractShineonSourceId({ store_order_id: "1012" })).toBe("1012");
    expect(extractShineonSourceId({ external_id: "1013" })).toBe("1013");
  });
  it("derives it from a line item's store_line_item_id by stripping the -N suffix", () => {
    expect(extractShineonSourceId({ line_items: [{ store_line_item_id: "1011-1" }] })).toBe("1011");
  });
  it("returns null when nothing is present", () => {
    expect(extractShineonSourceId({})).toBeNull();
  });
});

describe("extractShineonOrderId", () => {
  it("reads ShineOn's own order id from the order object", () => {
    expect(extractShineonOrderId({ order: { id: 20039 } })).toBe("20039");
  });
  it("reads it from a bare object", () => {
    expect(extractShineonOrderId({ id: 20039 })).toBe("20039");
  });
  it("returns null when absent", () => {
    expect(extractShineonOrderId({ source_id: "1011" })).toBeNull();
    expect(extractShineonOrderId(null)).toBeNull();
  });
  it("extracts ShineOn's id from the documented callback", () => {
    expect(extractShineonOrderId(SHINEON_CALLBACK.order)).toBe("20039");
  });
});

describe("sourceIdToOrderId", () => {
  it("extracts the order UUID from an icount-<uuid> source id", () => {
    expect(sourceIdToOrderId("icount-" + ORDER_UUID)).toBe(ORDER_UUID);
  });
  it("returns null for a docnum source id (matched by icount_docnum instead)", () => {
    expect(sourceIdToOrderId("1011")).toBeNull();
  });
  it("returns null for empty input", () => {
    expect(sourceIdToOrderId("")).toBeNull();
    expect(sourceIdToOrderId(null as any)).toBeNull();
  });
});

describe("extractTracking", () => {
  it("pulls number, url and carrier from common ShineOn field names", () => {
    const t = extractTracking({
      tracking_number: "1Z999",
      tracking_url: "https://track/1Z999",
      carrier: "UPS",
    });
    expect(t.number).toBe("1Z999");
    expect(t.url).toBe("https://track/1Z999");
    expect(t.carrier).toBe("UPS");
  });
  it("supports camelCase / alias field names", () => {
    const t = extractTracking({ trackingNumber: "X1", trackingUrl: "https://t/x1", shipping_carrier: "USPS" });
    expect(t.number).toBe("X1");
    expect(t.url).toBe("https://t/x1");
    expect(t.carrier).toBe("USPS");
  });
  it("reads tracking nested inside line_items (real ShineOn shape: tracking_company)", () => {
    const t = extractTracking(SHINEON_CALLBACK.order);
    expect(t.number).toBe("9400110200881958183792");
    expect(t.carrier).toBe("USPS");
    expect(t.url).toBeNull(); // ShineOn sends no tracking_url
  });
  it("picks the first line item that actually carries a tracking number", () => {
    const t = extractTracking({
      line_items: [
        { sku: "A" },
        { sku: "B", tracking_number: "TN-2", tracking_company: "FedEx" },
      ],
    });
    expect(t.number).toBe("TN-2");
    expect(t.carrier).toBe("FedEx");
  });
  it("returns nulls when nothing is present", () => {
    const t = extractTracking({});
    expect(t.number).toBeNull();
    expect(t.url).toBeNull();
    expect(t.carrier).toBeNull();
  });
});

describe("aggregatorTrackingUrl", () => {
  it("builds a Parcels App link from the tracking number", () => {
    expect(aggregatorTrackingUrl("9400110200881958183792")).toBe(
      "https://parcelsapp.com/en/tracking/9400110200881958183792",
    );
  });
  it("url-encodes the number", () => {
    expect(aggregatorTrackingUrl("AB 12/34")).toBe(
      "https://parcelsapp.com/en/tracking/AB%2012%2F34",
    );
  });
  it("returns null for empty / missing numbers", () => {
    expect(aggregatorTrackingUrl(null)).toBeNull();
    expect(aggregatorTrackingUrl(undefined)).toBeNull();
    expect(aggregatorTrackingUrl("  ")).toBeNull();
  });
});

describe("documented ShineOn callback (end-to-end field extraction)", () => {
  it("matches by ShineOn's own id and recovers our ref + tracking", () => {
    const body = unwrapShineonBody(SHINEON_CALLBACK);
    expect(extractShineonOrderId(body)).toBe("20039"); // primary match key
    expect(extractShineonSourceId(body)).toBe("1011");  // fallback: store_order_id / store_line_item_id
    const t = extractTracking(body);
    expect(t.number).toBe("9400110200881958183792");
    expect(t.carrier).toBe("USPS");
  });
});
