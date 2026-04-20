import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

export const presetToday = (): DateRange => {
  const now = new Date();
  return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
};
export const presetYesterday = (): DateRange => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return { from: startOfDay(d), to: endOfDay(d), label: "Yesterday" };
};
export const presetLast7 = (): DateRange => {
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - 6);
  return { from: startOfDay(from), to: endOfDay(to), label: "Last 7 Days" };
};
export const presetCurrentMonth = (): DateRange => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: startOfDay(from), to: endOfDay(now), label: "Current Month" };
};

export const isSingleDay = (r: DateRange) =>
  startOfDay(r.from).getTime() === startOfDay(r.to).getTime();

export const shiftDay = (r: DateRange, dir: -1 | 1): DateRange => {
  const base = isSingleDay(r) ? r.from : r.to;
  const d = new Date(base); d.setDate(d.getDate() + dir);
  return {
    from: startOfDay(d),
    to: endOfDay(d),
    label: startOfDay(d).getTime() === startOfDay(new Date()).getTime() ? "Today" : d.toLocaleDateString(),
  };
};

export const inRange = (iso: string | Date, r: DateRange) => {
  const t = (typeof iso === "string" ? new Date(iso) : iso).getTime();
  return t >= r.from.getTime() && t <= r.to.getTime();
};

interface Ctx {
  range: DateRange;
  setRange: (r: DateRange) => void;
}
const DateRangeCtx = createContext<Ctx | null>(null);

export const DateRangeProvider = ({ children }: { children: ReactNode }) => {
  const [range, setRangeState] = useState<DateRange>(() => presetToday());
  const setRange = useCallback((r: DateRange) => setRangeState(r), []);
  const value = useMemo(() => ({ range, setRange }), [range, setRange]);
  return <DateRangeCtx.Provider value={value}>{children}</DateRangeCtx.Provider>;
};

export const useDateRange = () => {
  const ctx = useContext(DateRangeCtx);
  if (!ctx) throw new Error("useDateRange must be used inside DateRangeProvider");
  return ctx;
};
