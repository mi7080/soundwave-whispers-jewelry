import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminTab {
  key: string;
  label: string;
  icon: ReactNode;
  /** Optional count badge (e.g. orders needing attention). */
  badge?: number;
}

interface AdminShellProps {
  tabs: AdminTab[];
  active: string;
  onChange: (key: string) => void;
  onSignOut: () => void;
  /** Extra header controls, e.g. the date range picker. */
  headerExtra?: ReactNode;
  children: ReactNode;
}

/**
 * Single admin chrome — Warm Memorial light theme, matches the public site.
 * Header + data-driven underline tab nav. All surfaces token-driven.
 */
export const AdminShell = ({ tabs, active, onChange, onSignOut, headerExtra, children }: AdminShellProps) => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border sticky top-0 z-30 backdrop-blur-md bg-background/85">
      <div className="container mx-auto px-6 py-5 max-w-7xl">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-gold transition-colors mb-3"
            >
              <ArrowLeft className="w-3 h-3" /> Exit Command Center
            </Link>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-gold" aria-hidden="true" />
              <h1 className="font-serif text-3xl tracking-wide text-foreground">ANIMUS Command Center</h1>
            </div>
            <p className="text-[10px] mt-2 tracking-[0.3em] uppercase text-gold">Elite Operations · Founder Access</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {headerExtra}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              aria-label="Sign out of the command center"
              className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-3 h-3" /> Sign Out
            </Button>
          </div>
        </div>

        <nav className="flex items-center gap-1 mt-6 -mb-5 border-b border-border overflow-x-auto" aria-label="Admin sections">
          {tabs.map((t) => {
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-[11px] tracking-[0.25em] uppercase transition-colors border-b-2 -mb-px whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-sm",
                  isActive
                    ? "text-gold border-gold font-semibold"
                    : "text-muted-foreground border-transparent hover:text-foreground",
                )}
              >
                {t.icon}
                {t.label}
                {typeof t.badge === "number" && t.badge > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/30 tabular-nums">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>

    <main>{children}</main>
  </div>
);
