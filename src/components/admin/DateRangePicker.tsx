import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import {
  useDateRange, presetToday, presetYesterday, presetLast7, presetCurrentMonth,
  shiftDay, isSingleDay, DateRange,
} from "./DateRangeContext";

const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const presets: { label: string; build: () => DateRange }[] = [
  { label: "Today", build: presetToday },
  { label: "Yesterday", build: presetYesterday },
  { label: "Last 7 Days", build: presetLast7 },
  { label: "Current Month", build: presetCurrentMonth },
];

export const DateRangePicker = () => {
  const { range, setRange } = useDateRange();
  const [open, setOpen] = useState(false);

  const display = isSingleDay(range) ? fmt(range.from) : `${fmt(range.from)} → ${fmt(range.to)}`;

  return (
    <div className="relative flex items-center gap-1">
      <button
        onClick={() => setRange(shiftDay(range, -1))}
        className="w-8 h-8 flex items-center justify-center border transition-all"
        style={{ borderColor: "rgba(212,175,55,0.25)", color: "#D4AF37" }}
        aria-label="Previous day"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 h-8 border text-[10px] tracking-[0.2em] uppercase transition-all"
        style={{ borderColor: "rgba(212,175,55,0.25)", color: "#D4AF37", backgroundColor: "rgba(212,175,55,0.04)" }}
      >
        <CalIcon className="w-3 h-3" />
        <span style={{ color: "#F5F5F0", letterSpacing: "0.15em" }}>{range.label}</span>
        <span style={{ color: "#888" }}>· {display}</span>
      </button>

      <button
        onClick={() => setRange(shiftDay(range, 1))}
        className="w-8 h-8 flex items-center justify-center border transition-all"
        style={{ borderColor: "rgba(212,175,55,0.25)", color: "#D4AF37" }}
        aria-label="Next day"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-10 z-50 min-w-[220px] border rounded-sm shadow-2xl py-2"
            style={{ backgroundColor: "#0F0F0F", borderColor: "rgba(212,175,55,0.25)" }}
          >
            <p className="px-3 pb-2 text-[9px] tracking-[0.25em] uppercase border-b mb-1"
               style={{ color: "#888", borderColor: "rgba(212,175,55,0.1)" }}>
              Quick Select
            </p>
            {presets.map(p => {
              const active = range.label === p.label;
              return (
                <button
                  key={p.label}
                  onClick={() => { setRange(p.build()); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs tracking-wide transition-all"
                  style={{
                    color: active ? "#D4AF37" : "#F5F5F0",
                    backgroundColor: active ? "rgba(212,175,55,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "rgba(212,175,55,0.05)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
