import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin UI primitives - Warm Memorial light theme.
 * Every admin surface uses these so the panel stays DRY and on-brand
 * with the public selling page. No hardcoded hex - tokens only.
 */

export const adminCardShadow = "shadow-[0_18px_40px_-24px_rgba(80,55,30,0.35)]";

export const AdminCard = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn("rounded-xl bg-card border border-border", adminCardShadow, className)}>{children}</div>
);

export const AdminSectionHeader = ({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}) => (
  <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
    <div>
      {eyebrow && <p className="text-[10px] tracking-[0.25em] uppercase text-gold mb-1">{eyebrow}</p>}
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
    </div>
    {right}
  </div>
);

export type KpiTone = "default" | "accent" | "positive" | "negative";

export const AdminKpi = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: KpiTone;
}) => {
  const valueClass: Record<KpiTone, string> = {
    default: "text-foreground",
    accent: "text-gold",
    positive: "text-emerald-700",
    negative: "text-destructive",
  };
  return (
    <AdminCard className="p-4">
      <p className={cn("font-serif text-2xl tabular-nums", valueClass[tone])}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase mt-1 text-muted-foreground">{label}</p>
    </AdminCard>
  );
};

export const AdminEmpty = ({ children }: { children: ReactNode }) => (
  <AdminCard className="py-16 text-center text-sm text-muted-foreground">{children}</AdminCard>
);

export type StatusTone = { text: string; chip: string };

/** Cream-safe status tones (replaces dark-tuned emerald/amber-400). */
export function statusTone(status: string): StatusTone {
  switch (status) {
    case "fulfilled":
    case "shipped":
      return { text: "text-emerald-700", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "paid":
    case "payment_pending":
      return { text: "text-gold-dark", chip: "bg-gold/10 text-gold-dark border-gold/30" };
    case "shineon_error":
    case "payment_failed":
      return { text: "text-destructive", chip: "bg-destructive/10 text-destructive border-destructive/30" };
    default:
      return { text: "text-muted-foreground", chip: "bg-muted text-muted-foreground border-border" };
  }
}
