import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  contentParams,
  track,
  fireOnce,
  trackPurchase,
  trackViewContent,
  trackInitiateCheckout,
} from "@/lib/pixel";
import { PRODUCT_CONFIG } from "@/config/product";

describe("pixel", () => {
  beforeEach(() => {
    sessionStorage.clear();
    (window as any).fbq = vi.fn();
  });

  describe("contentParams", () => {
    it("defaults value to the founders price and sets currency", () => {
      expect(contentParams()).toEqual({
        content_ids: ["animus-pendant"],
        content_name: PRODUCT_CONFIG.title,
        content_type: "product",
        value: PRODUCT_CONFIG.foundersPrice,
        currency: "USD",
      });
    });

    it("uses the provided value", () => {
      expect(contentParams(42)).toMatchObject({ value: 42 });
    });
  });

  describe("track", () => {
    it("forwards event + params to fbq", () => {
      track("ViewContent", { value: 89 });
      expect((window as any).fbq).toHaveBeenCalledWith("track", "ViewContent", { value: 89 });
    });

    it("passes eventID as the dedup option when provided", () => {
      track("Purchase", { value: 89 }, "order-123");
      expect((window as any).fbq).toHaveBeenCalledWith(
        "track",
        "Purchase",
        { value: 89 },
        { eventID: "order-123" }
      );
    });

    it("is a no-op when fbq is not loaded", () => {
      delete (window as any).fbq;
      expect(() => track("ViewContent")).not.toThrow();
    });
  });

  describe("fireOnce", () => {
    it("runs the callback once per key", () => {
      const fn = vi.fn();
      fireOnce("k", fn);
      fireOnce("k", fn);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("treats different keys independently", () => {
      const fn = vi.fn();
      fireOnce("a", fn);
      fireOnce("b", fn);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("trackPurchase", () => {
    it("fires Purchase with value, num_items and eventID = order id", () => {
      trackPurchase("order-123", 89);
      expect((window as any).fbq).toHaveBeenCalledWith(
        "track",
        "Purchase",
        {
          content_ids: ["animus-pendant"],
          content_name: PRODUCT_CONFIG.title,
          content_type: "product",
          value: 89,
          currency: "USD",
          num_items: 1,
        },
        { eventID: "order-123" }
      );
    });

    it("does not fire twice for the same order (refresh guard)", () => {
      trackPurchase("order-123", 89);
      trackPurchase("order-123", 89);
      expect((window as any).fbq).toHaveBeenCalledTimes(1);
    });

    it("fires again for a different order", () => {
      trackPurchase("order-1", 89);
      trackPurchase("order-2", 89);
      expect((window as any).fbq).toHaveBeenCalledTimes(2);
    });
  });

  describe("funnel events fire once per session/order", () => {
    it("ViewContent fires once per session", () => {
      trackViewContent();
      trackViewContent();
      expect((window as any).fbq).toHaveBeenCalledTimes(1);
      expect((window as any).fbq).toHaveBeenCalledWith(
        "track",
        "ViewContent",
        expect.objectContaining({ content_type: "product" })
      );
    });

    it("InitiateCheckout keys off the order id", () => {
      trackInitiateCheckout("order-1", 89);
      trackInitiateCheckout("order-1", 89);
      trackInitiateCheckout("order-2", 89);
      expect((window as any).fbq).toHaveBeenCalledTimes(2);
    });
  });
});
