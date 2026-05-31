import { describe, it, expect } from "vitest";
import { computeFinanceStats, type FinanceOrder, type FinanceCosts } from "@/lib/financeStats";
import type { DateRange } from "@/components/admin/DateRangeContext";

const COSTS: FinanceCosts = {
  shineon_unit_cost: 15,
  transaction_fee_percent: 2.9,
  transaction_fee_fixed: 0.3,
  monthly_ad_spend: 200,
};

// 2 paid orders in April 2026, 4 paid orders in May 2026, 1 unpaid in May.
const ORDERS: FinanceOrder[] = [
  { amount: 200, created_at: "2026-04-10T12:00:00", status: "paid" },
  { amount: 200, created_at: "2026-04-20T12:00:00", status: "fulfilled" },
  { amount: 200, created_at: "2026-05-05T12:00:00", status: "paid" },
  { amount: 200, created_at: "2026-05-10T12:00:00", status: "shipped" },
  { amount: 200, created_at: "2026-05-15T12:00:00", status: "shineon_error" },
  { amount: 200, created_at: "2026-05-20T12:00:00", status: "paid" },
  { amount: 200, created_at: "2026-05-25T12:00:00", status: "payment_pending" }, // excluded
];

const range = (from: string, to: string): DateRange => ({
  from: new Date(from),
  to: new Date(to),
  label: "test",
});

// fees per $200 order = 200*2.9% + 0.30 = 6.10 ; production = 15
// April ad share = 200/2 = 100 each ; May ad share = 200/4 = 50 each
const APR_PROFIT = 200 - 15 - 6.1 - 100; // 78.90
const MAY_PROFIT = 200 - 15 - 6.1 - 50; // 128.90

describe("computeFinanceStats — per-month ad share", () => {
  it("excludes non-paid orders", () => {
    const s = computeFinanceStats(ORDERS, COSTS, range("2026-01-01", "2026-12-31"));
    expect(s.orderCount).toBe(6);
  });

  it("charges a full month exactly one monthly_ad_spend", () => {
    // May only
    const s = computeFinanceStats(ORDERS, COSTS, range("2026-05-01T00:00:00", "2026-05-31T23:59:59"));
    expect(s.orderCount).toBe(4);
    expect(s.totalRevenue).toBe(800);
    expect(s.totalAdCost).toBeCloseTo(200, 6); // one month's budget, not 4×
    expect(s.totalProfit).toBeCloseTo(4 * MAY_PROFIT, 6);
  });

  it("all-time sums one budget per month that has orders", () => {
    const s = computeFinanceStats(ORDERS, COSTS, range("2026-01-01", "2026-12-31"));
    expect(s.totalRevenue).toBe(1200);
    expect(s.totalAdCost).toBeCloseTo(400, 6); // April $200 + May $200
    expect(s.totalProfit).toBeCloseTo(2 * APR_PROFIT + 4 * MAY_PROFIT, 6);
    expect(s.avgAdPerOrder).toBeCloseTo(400 / 6, 6);
  });

  it("a partial-month window keeps the month's full denominator (not the window count)", () => {
    // catches only the 05-05 and 05-10 orders → 2 of May's 4
    const s = computeFinanceStats(ORDERS, COSTS, range("2026-05-04T00:00:00", "2026-05-11T00:00:00"));
    expect(s.orderCount).toBe(2);
    expect(s.totalAdCost).toBeCloseTo(100, 6); // 2 × (200/4), denominator stays 4
    expect(s.totalProfit).toBeCloseTo(2 * MAY_PROFIT, 6);
  });

  it("per-order profit matches the aggregate", () => {
    const s = computeFinanceStats(ORDERS, COSTS, range("2026-01-01", "2026-12-31"));
    const summed = s.paidOrders.reduce((acc, o) => acc + s.profitFor(o), 0);
    expect(summed).toBeCloseTo(s.totalProfit, 6);
  });

  it("handles zero orders without dividing by zero", () => {
    const s = computeFinanceStats(ORDERS, COSTS, range("2030-01-01", "2030-12-31"));
    expect(s.orderCount).toBe(0);
    expect(s.totalRevenue).toBe(0);
    expect(s.avgOrderValue).toBe(0);
    expect(s.avgProfit).toBe(0);
    expect(s.margin).toBe(0);
  });
});
