# Admin Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the ANIMUS admin into a single, light "Warm Memorial"–themed command center that matches the public selling page, removes the standalone Recovery tab (folding its function into Orders + auto-retry), and consolidates the legacy dashboards without losing any production-critical feature.

**Architecture:** One admin shell (`AdminControl`) on the light cream design tokens already in `index.css`. A small set of reusable admin primitives (`AdminShell`, `AdminCard`, `AdminKpi`, status-tone map) built on existing shadcn/ui + tokens carry the visual contract so every tab is DRY and consistent. Recovery becomes a "Needs Attention" view inside Orders; the webhook gains transient-vs-permanent error handling + a cron sweep so failures self-heal.

**Tech Stack:** React + React Router, Tailwind (token-driven, `darkMode: class`, `:root` = warm cream), shadcn/ui, lucide-react, sonner, Supabase (Postgres + Edge Functions / Deno), 21st.dev (`mcp__magic`) for component inspiration on KPI cards + empty states.

---

## Design System (the visual contract - matches selling page)

Source tokens: `src/index.css` `:root` (Warm Memorial). Never hardcode hex in admin again.

| Role | Token / class | Notes |
|------|---------------|-------|
| Page background | `bg-background` | cream `37 44% 93%` |
| Card / surface | `bg-card border border-border` + `shadow-[0_18px_40px_-24px_rgba(80,55,30,0.35)]` | warm white, soft warm shadow (echoes selling page) |
| Heading | `font-serif text-foreground` | Fraunces espresso |
| Micro-label | `text-[10px] tracking-[0.25em] uppercase text-gold` | gold eyebrow, same as selling page |
| Body / muted | `text-muted-foreground` | |
| Primary action | shadcn `Button` (default = `bg-primary text-primary-foreground`) | espresso pill |
| Accent / key metric | `text-gold`; terracotta italic `text-[hsl(24_47%_47%)]` for emphasis | |
| Numbers (money, counts) | add `tabular-nums` | prevents layout shift |
| Radius | `rounded-xl` cards, `rounded-lg` controls | token radius 0.625rem |

**Status tone map (cream-safe, replaces dark emerald/amber-400):**

| Status | Text | Bg | Border |
|--------|------|----|--------|
| fulfilled / shipped / success | `text-emerald-700` | `bg-emerald-50` | `border-emerald-200` |
| paid / in-progress | `text-gold-dark` | `bg-gold/10` | `border-gold/30` |
| pending | `text-muted-foreground` | `bg-muted` | `border-border` |
| shineon_error / failed | `text-destructive` | `bg-destructive/10` | `border-destructive/30` |

**A11y (skill priority #1–2, non-negotiable):** all icon-only buttons get `aria-label`; keep shadcn focus rings; verify text contrast ≥4.5:1 on cream (the gray `#888`-equivalent must become `text-muted-foreground` which is `31 16% 42%` = AA on cream); touch targets ≥44px; `prefers-reduced-motion` already respected via tailwindcss-animate.

**Anti-patterns to avoid (from ui-ux-pro-max):** ornate decoration, no filtering on tables, emoji as icons, color-only status meaning (always pair icon+text).

---

## File Structure

**New:**
- `src/components/admin/AdminShell.tsx` - page chrome: header, brand, sign-out, date picker, tab nav. Light themed.
- `src/components/admin/ui.tsx` - primitives: `AdminCard`, `AdminKpi`, `AdminSectionHeader`, `statusTone()` helper, `AdminEmpty`.
- `supabase/migrations/<ts>_shineon_retry_columns.sql` - retry tracking columns.
- `supabase/functions/shineon-retry-sweep/index.ts` - cron sweep for transient failures.

**Modified:**
- `src/pages/AdminControl.tsx` - convert all inline-hex → tokens/primitives; remove Recovery tab; add Production tab (absorbs AdminDashboard); CRM tab gains bulk campaign + mark-contacted.
- `src/pages/AdminOrders.tsx` - retune status tones for cream; rename "errors" tab → "Needs Attention" (catches `shineon_error` OR `paid`+no PNG); add render-PNG / render+submit actions there + in modal.
- `supabase/functions/icount-payment-webhook/index.ts` - classify transient vs permanent; write retry columns; schedule next retry.
- `src/App.tsx` - redirect `/admin-dashboard` → `/admin/control`; drop dead `AdminDashboard` import; keep `/admin/orders` (deep link) but it renders inside shell context.

**Deleted (after feature port verified):**
- `src/pages/AdminCRM.tsx`, `src/pages/AdminDashboard.tsx`.

---

## PHASE A - Visual redesign (the core ask)

Independently shippable: admin looks like the brand, no behavior change.

### Task A1: Admin primitives

**Files:**
- Create: `src/components/admin/ui.tsx`

- [ ] **Step 1: Write primitives (full code)**

```tsx
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const adminCardShadow = "shadow-[0_18px_40px_-24px_rgba(80,55,30,0.35)]";

export const AdminCard = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn("rounded-xl bg-card border border-border", adminCardShadow, className)}>{children}</div>
);

export const AdminSectionHeader = ({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) => (
  <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
    <div>
      {eyebrow && <p className="text-[10px] tracking-[0.25em] uppercase text-gold mb-1">{eyebrow}</p>}
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
    </div>
    {right}
  </div>
);

export const AdminKpi = ({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" | "positive" | "negative" }) => {
  const valueClass = {
    default: "text-foreground",
    accent: "text-gold",
    positive: "text-emerald-700",
    negative: "text-destructive",
  }[tone];
  return (
    <AdminCard className="p-4">
      <p className={cn("font-serif text-2xl tabular-nums", valueClass)}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase mt-1 text-muted-foreground">{label}</p>
    </AdminCard>
  );
};

export const AdminEmpty = ({ children }: { children: ReactNode }) => (
  <AdminCard className="py-16 text-center text-sm text-muted-foreground">{children}</AdminCard>
);

export type StatusTone = { text: string; chip: string };
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
```

- [ ] **Step 2: Build & typecheck.** Run: `npm run build` (or `npx tsc --noEmit`). Expected: passes, no unused-import errors.
- [ ] **Step 3: Commit.** `git add src/components/admin/ui.tsx && git commit -m "feat(admin): add light-theme admin UI primitives"`

### Task A2: AdminShell (header + tab nav, light)

**Files:**
- Create: `src/components/admin/AdminShell.tsx`

Extract the header/nav from `AdminControl.tsx:105-159`. Convert: page wrapper `min-h-screen bg-background`; header `border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-30`; brand `font-serif text-3xl text-foreground` + gold `Sparkles`; eyebrow gold micro-label; sign-out → shadcn `Button variant="ghost"` with `aria-label`. Tab nav: token-based `CmdTab` (active = `text-gold border-gold`, inactive = `text-muted-foreground hover:text-foreground`, `border-b-2`). Accept `tabs` config + `active`/`onChange` props so tab list is data-driven (no hardcoded 5 buttons).

- [ ] Step 1: Implement `AdminShell` with props `{ tabs: {key,label,icon,badge?}[]; active; onChange; children }`. Use 21st.dev (`mcp__magic` `21st_magic_component_inspiration`) for a clean dashboard header reference, then adapt to tokens.
- [ ] Step 2: `npm run build` - passes.
- [ ] Step 3: Commit `feat(admin): light AdminShell with data-driven tab nav`.

### Task A3: Convert AdminControl tabs to tokens/primitives

**Files:** Modify `src/pages/AdminControl.tsx`

Per-tab transformation (replace every `style={{ ... hex ... }}` with classes):
- Loaders: `style={{color:"#D4AF37"}}` → `className="text-gold"`.
- `FinanceTab` (188-339): `Kpi` → `AdminKpi`; per-order table → wrap in `AdminCard`, header row `text-muted-foreground`, profit cell tone via `statusTone`/positive-negative, amounts `tabular-nums`; `CostAlert` → shadcn `Alert` (`variant="destructive"` for warn) or token card.
- `CrmTab` (370-536): tables → `AdminCard` + token classes; `CrmToggle` → shadcn `Tabs` or token toggle; send buttons → shadcn `Button variant="outline"` (gold) with `aria-label`.
- `SettingsTab` (816-953): `SettingField` input → shadcn `Input` + `Label`; prefix/suffix adornments token-styled; Save → shadcn `Button`.
- Use `AdminSectionHeader` for each tab title.

- [ ] Step 1: Convert FinanceTab. Build.
- [ ] Step 2: Convert CrmTab. Build.
- [ ] Step 3: Convert SettingsTab. Build.
- [ ] Step 4: Wire `AdminControl` to render `AdminShell` (remove old inline header). Build.
- [ ] Step 5: Manual verify - run app, log in, eyeball each tab on cream (contrast, spacing). Commit `refactor(admin): convert AdminControl to light tokens + primitives`.

### Task A4: Retune AdminOrders status tones for cream

**Files:** Modify `src/pages/AdminOrders.tsx`

`StatusPill` (794-811) and `ShineOnErrorsTable` (926-995) use `emerald-400/amber-400/blue-300` (dark-tuned). Replace with `statusTone()` from primitives. Stat cards → `AdminKpi`. Tables → `AdminCard`. Verify contrast on cream.

- [ ] Step 1: Import + apply `statusTone`, `AdminCard`, `AdminKpi`. Build.
- [ ] Step 2: Manual verify at `/admin/orders` on cream. Commit `refactor(admin): retune AdminOrders tones for light theme`.

---

## PHASE B - Consolidation + Recovery merge

Depends on Phase A shell existing.

### Task B1: Fold Recovery into Orders "Needs Attention"

**Files:** Modify `src/pages/AdminOrders.tsx`, `src/pages/AdminControl.tsx`

AdminOrders already has an `errors` tab (shineon_error) + modal with Generate PNG. Extend:
- Rename `errors` tab → "Needs Attention"; its query/filter catches `status==="shineon_error" OR (status==="paid" && !print_image_url)`.
- Port the two panic flows from `AdminControl.RecoveryTab` (`handleRenderPng`, `handleRenderAndSubmit` at 575-673) into this tab as row actions: "Render + Submit" (primary) and "Render PNG". `Retry ShineOn` already exists.
- Show a count badge on the tab (`tabs[].badge`).
- Remove the `recovery` tab from `AdminControl` (delete `RecoveryTab` 552-813, `TabKey` union member, nav button 143, render line 153, unused imports `AlertOctagon`, `RotateCw`, `Zap`).

- [ ] Step 1: Extend Needs Attention query + actions in AdminOrders. Build.
- [ ] Step 2: Remove RecoveryTab from AdminControl. Build (verify no dangling refs).
- [ ] Step 3: Manual verify: create/simulate a `shineon_error` order, confirm it appears under Needs Attention with working Render+Submit. Commit `feat(admin): merge recovery into Orders Needs-Attention; remove Recovery tab`.

### Task B2: Add Production tab (preserve AdminDashboard features)

**Files:** Modify `src/pages/AdminControl.tsx` (new `ProductionTab`)

Port from `AdminDashboard.tsx`: daily batch CSV export + `exported_at` tracking (168-216), date-grouped quick-select (101-108, 314-358), SVG front/back download + regenerate (110-150), per-order asset links (387-463). Style with primitives.

- [ ] Step 1: Implement `ProductionTab`, add to shell tab list (icon `FileSpreadsheet`). Build.
- [ ] Step 2: Manual verify CSV export downloads + marks exported. Commit `feat(admin): add Production tab (batch export, SVG tools)`.

### Task B3: CRM tab - add bulk campaign + mark-contacted

**Files:** Modify `src/pages/AdminControl.tsx` (`CrmTab`)

Port `send-campaign-email` bulk send (email1/email2 + test send) from `AdminDashboard.tsx:51-73,242-312`; port lead "Mark contacted" status update from `AdminCRM.tsx`.

- [ ] Step 1: Add campaign send UI (with test-email guard + confirm dialog before full send - shadcn `AlertDialog`). Build.
- [ ] Step 2: Add "Mark contacted" action to leads rows. Build.
- [ ] Step 3: Manual verify test-send only (do NOT trigger full campaign). Commit `feat(admin): CRM bulk campaign + mark-contacted`.

### Task B4: Delete legacy + fix routes

**Files:** Modify `src/App.tsx`; Delete `src/pages/AdminCRM.tsx`, `src/pages/AdminDashboard.tsx`

- [ ] Step 1: In `App.tsx` remove imports of `AdminCRM`, `AdminDashboard`; change `/admin-dashboard` route to `<Navigate replace to="/admin/control" />`. Build.
- [ ] Step 2: `git rm src/pages/AdminCRM.tsx src/pages/AdminDashboard.tsx`. Build - confirm no broken imports (grep for the names first).
- [ ] Step 3: Commit `chore(admin): remove legacy AdminCRM/AdminDashboard, redirect route`.

---

## PHASE C - Auto-retry (failures self-heal)

Independent backend subsystem. Reduces how often Needs-Attention is needed.

### Task C1: Retry tracking columns

**Files:** Create `supabase/migrations/<ts>_shineon_retry_columns.sql`

- [ ] Step 1: Migration:

```sql
ALTER TABLE public.animus_orders
  ADD COLUMN IF NOT EXISTS shineon_retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shineon_last_error text,
  ADD COLUMN IF NOT EXISTS shineon_last_error_status int,
  ADD COLUMN IF NOT EXISTS shineon_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS shineon_next_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_animus_orders_retry
  ON public.animus_orders (shineon_next_retry_at)
  WHERE status = 'shineon_error';
```

- [ ] Step 2: Apply locally (`supabase db push` or project workflow). Commit `feat(db): shineon retry tracking columns`.

### Task C2: Classify transient vs permanent in webhook

**Files:** Modify `supabase/functions/icount-payment-webhook/index.ts` (around 317-342); Test: `supabase/functions/icount-payment-webhook/index.test.ts`

Logic: transient = HTTP 429/5xx or fetch throw (network/timeout); permanent = 4xx or `no_print_asset`. On transient: set `shineon_next_retry_at = now + backoff(retry_count)` (backoff: 5m, 30m, 2h; cap 3 attempts), increment `shineon_retry_count`, store `shineon_last_error*`, keep status `shineon_error`. On permanent: as today (no next_retry). Extract a pure helper `classifyShineOnFailure(status?: number, threw: boolean)` and `backoffMs(attempt: number)` so they're unit-testable.

- [ ] Step 1: Write failing test for `backoffMs` + `classifyShineOnFailure`:

```ts
import { assertEquals } from "https://deno.land/std/assert/mod.ts";
import { backoffMs, classifyShineOnFailure } from "./helpers.ts";

Deno.test("backoff grows then caps", () => {
  assertEquals(backoffMs(0), 5 * 60_000);
  assertEquals(backoffMs(1), 30 * 60_000);
  assertEquals(backoffMs(2), 120 * 60_000);
});
Deno.test("5xx + network are transient, 4xx permanent", () => {
  assertEquals(classifyShineOnFailure(503, false), "transient");
  assertEquals(classifyShineOnFailure(429, false), "transient");
  assertEquals(classifyShineOnFailure(undefined, true), "transient");
  assertEquals(classifyShineOnFailure(400, false), "permanent");
  assertEquals(classifyShineOnFailure(409, false), "permanent");
});
```

- [ ] Step 2: Run `deno test supabase/functions/icount-payment-webhook/` - expect FAIL (not defined).
- [ ] Step 3: Implement `backoffMs` + `classifyShineOnFailure` in `helpers.ts`; wire into the error branch of `index.ts`.
- [ ] Step 4: `deno test ...` - PASS.
- [ ] Step 5: Commit `feat(webhook): classify transient ShineOn failures + schedule retry`.

### Task C3: Cron retry sweep

**Files:** Create `supabase/functions/shineon-retry-sweep/index.ts`

Query `animus_orders WHERE status='shineon_error' AND shineon_retry_count < 3 AND shineon_next_retry_at <= now() LIMIT 10`; for each, re-invoke the existing submission path (reuse webhook via internal call with service role, or shared submit helper). Schedule via Supabase cron (every 15 min). Document the cron SQL in the file header.

- [ ] Step 1: Implement sweep. `deno check`.
- [ ] Step 2: Add cron schedule (pg_cron / dashboard). Document in header comment.
- [ ] Step 3: Commit `feat(webhook): cron sweep auto-retries transient ShineOn failures`.

---

## Self-Review

- **Spec coverage:** match selling theme → A1–A4, design-system table. Easy to use/understand → primitives + AdminShell + a11y rules. Remove Recovery tab → B1. "System won't have issues with ShineOn" → C1–C3 auto-retry + Needs-Attention safety net. Consolidation → B2–B4 (preserves batch export, campaign email, SVG tools - the unique AdminDashboard features). ✅
- **Placeholder scan:** primitives + migration + tests are full code; per-file restyle tasks specify exact source line ranges + class mappings. ✅
- **Type consistency:** `statusTone()`, `AdminKpi` tone union, `tabs[].badge` used consistently A1→A2→B1. ✅
- **Risk note:** Phase A is pure restyle (low risk). Phase B deletes files - grep for usages before `git rm`. Phase C touches the live payment→fulfillment path - keep permanent-error behavior identical; only add retry scheduling on transient.
```
