import { inRange, type DateRange } from "@/components/admin/DateRangeContext";

// Orders that count as revenue: payment captured, regardless of fulfilment state.
export const PAID_STATUSES = ["paid", "fulfilled", "shipped", "shineon_error"];

export interface FinanceOrder {
  amount: number | null;
  created_at: string;
  status: string;
}

export interface FinanceCosts {
  shineon_unit_cost: number;
  transaction_fee_percent: number;
  transaction_fee_fixed: number;
  monthly_ad_spend: number;
}

export interface FinanceStats {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalAdCost: number;
  margin: number;
  avgOrderValue: number;
  avgProfit: number;
  avgAdPerOrder: number;
  orderCount: number;
  paidOrders: FinanceOrder[];
  /** Ad-spend attributed to a single order (its share of its month's budget). */
  adShareFor: (o: FinanceOrder) => number;
  /** Net profit for a single order. */
  profitFor: (o: FinanceOrder) => number;
  adAlert: boolean;
  productionAlert: boolean;
}

const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

/**
 * Finance stats for the selected date range.
 *
 * Revenue, fees and production cost are summed over the paid orders inside the
 * range. Ad spend is attributed per *month*: each paid order carries
 * `monthly_ad_spend / (paid orders in its calendar month, across all time)`.
 * So a full month inside the range contributes exactly one monthly_ad_spend,
 * a partial month contributes a proportional slice, and the denominator never
 * depends on which range is selected (or on today's date).
 */
export function computeFinanceStats(
  orders: FinanceOrder[],
  costs: FinanceCosts,
  range: DateRange | null,
): FinanceStats {
  const isPaid = (o: FinanceOrder) => PAID_STATUSES.includes(o.status) && !!o.amount;

  // Denominator is computed over ALL paid orders, grouped by their own month - 
  // never the current month and never the range, which is what made the old
  // calculation over-count ad cost across multi-month timelines.
  const paidAllTime = orders.filter(isPaid);
  const perMonthCount = new Map<string, number>();
  for (const o of paidAllTime) {
    const k = monthKey(o.created_at);
    perMonthCount.set(k, (perMonthCount.get(k) || 0) + 1);
  }
  const adShareFor = (o: FinanceOrder) => {
    const n = perMonthCount.get(monthKey(o.created_at)) || 1;
    return Number(costs.monthly_ad_spend) / n;
  };

  const feesFor = (amt: number) =>
    (amt * Number(costs.transaction_fee_percent)) / 100 + Number(costs.transaction_fee_fixed);

  const profitFor = (o: FinanceOrder) => {
    const amt = Number(o.amount) || 0;
    return amt - Number(costs.shineon_unit_cost) - feesFor(amt) - adShareFor(o);
  };

  const paidOrders = paidAllTime.filter((o) => !range || inRange(o.created_at, range));
  const totalRevenue = paidOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const count = paidOrders.length;
  const divisor = count || 1;

  const totalAdCost = paidOrders.reduce((s, o) => s + adShareFor(o), 0);
  const totalCost = paidOrders.reduce((s, o) => {
    const amt = Number(o.amount) || 0;
    return s + Number(costs.shineon_unit_cost) + feesFor(amt) + adShareFor(o);
  }, 0);

  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgOrderValue = totalRevenue / divisor;
  const avgProfit = totalProfit / divisor;
  const avgAdPerOrder = totalAdCost / divisor;

  const adAlert = avgOrderValue > 0 && avgAdPerOrder / avgOrderValue > 0.3;
  const productionAlert = avgOrderValue > 0 && Number(costs.shineon_unit_cost) / avgOrderValue > 0.4;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    totalAdCost,
    margin,
    avgOrderValue,
    avgProfit,
    avgAdPerOrder,
    orderCount: count,
    paidOrders,
    adShareFor,
    profitFor,
    adAlert,
    productionAlert,
  };
}
