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
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gold/30 text-gold hover:bg-gold/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 h-8 rounded-md border border-gold/30 bg-gold/[0.06] text-gold text-[10px] tracking-[0.2em] uppercase transition-colors hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CalIcon className="w-3 h-3" />
        <span className="text-foreground tracking-[0.15em]">{range.label}</span>
        <span className="text-muted-foreground">· {display}</span>
      </button>

      <button
        onClick={() => setRange(shiftDay(range, 1))}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gold/30 text-gold hover:bg-gold/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Next day"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 min-w-[220px] rounded-lg border border-border bg-card shadow-[0_18px_40px_-24px_rgba(80,55,30,0.45)] py-2">
            <p className="px-3 pb-2 text-[9px] tracking-[0.25em] uppercase border-b border-border mb-1 text-muted-foreground">
              Quick Select
            </p>
            {presets.map(p => {
              const active = range.label === p.label;
              return (
                <button
                  key={p.label}
                  onClick={() => { setRange(p.build()); setOpen(false); }}
                  className={
                    "w-full text-left px-3 py-2 text-xs tracking-wide transition-colors " +
                    (active ? "text-gold bg-gold/[0.08]" : "text-foreground hover:bg-gold/[0.05]")
                  }
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
