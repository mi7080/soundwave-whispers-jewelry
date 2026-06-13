# CLAUDE.md

## חוקים (חובה)

- רק עובדות מאומתות מהקוד. אפס המצאות.
- תמציתי. בלי מילוי. בלי הסברים גנריים על השפה/הפריימוורק.
- פקודות מדויקות שבדקת שקיימות, לא ניחושים.
- אם משהו לא ברור מהקוד - תשאל, אל תמציא.

## What this is

ANIMUS - single-product e-commerce store for the US market. Product = "The Universal Memorial Pendant", flat $89 USD across all variants ([src/config/product.ts](src/config/product.ts)). Laser-engraved dog-tag pendant (soundwave front, custom text back, scannable QR "Soul Page"). Brand domain: animuswaves.com.

Stack: Vite + React 18 + TypeScript + shadcn/ui (Radix) + Tailwind. Routing: react-router-dom v6. Data: @tanstack/react-query + zustand. Forms: react-hook-form + zod. Backend: Supabase (Postgres + Edge Functions, Deno). Payments: iCount. Fulfillment: ShineOn. Email: Resend.

Originally scaffolded by Lovable; the platform is no longer used (build tooling, Playwright config, and webhook libs migrated off it).

## Commands

- `npm run dev` - Vite dev server on port **8080**
- `npm run build` - prod build (`build:dev` for development mode)
- `npm run lint` - ESLint
- `npm test` - Vitest run (`test:watch` for watch)
- `npm run preview` - preview built site

Unit tests: Vitest, jsdom, `include: src/**/*.{test,spec}.{ts,tsx}`, setup `src/test/setup.ts` ([vitest.config.ts](vitest.config.ts)). E2E: Playwright (`@playwright/test`, [playwright.config.ts](playwright.config.ts), tests under `e2e/`); no npm script - invoke `npx playwright test` directly.

## Layout

- [src/pages/](src/pages/) - routes (see [src/App.tsx](src/App.tsx)). `/` = Index store, `/checkout`, `/thank-you`, `/soul/:id` = QR Soul Page, `/faq`, `/:slug` = PolicyPage (catch legal pages), admin under `/admin/control` + `/admin/orders` (`/admin` → control), `/admin-login` = AdminAuth.
- [src/components/](src/components/) - feature components; [src/components/ui/](src/components/ui/) is shadcn (generally don't hand-edit).
- [src/components/admin/](src/components/admin/) - admin shell + UI.
- [src/config/product.ts](src/config/product.ts) - single source of truth for price, variants, ShineOn product/template/SKUs, `resolveShineonSku()`.
- [src/integrations/supabase/](src/integrations/supabase/) - generated client + `types.ts`.
- [src/lib/](src/lib/) - `soulPage.ts`, `svgExport.ts`, `videoTrim.ts`, `financeStats.ts`, `utils.ts`.
- [supabase/functions/](supabase/functions/) - Edge Functions (Deno): iCount (`icount-create-payment`, `icount-payment-webhook`), ShineOn (`shineon-shipment-notification`, `shineon-retry-sweep`), email infra (`send-transactional-email`, `process-email-queue`, `send-campaign-email`, `handle-email-unsubscribe`), `render-engraving-png`, `upload-production-assets`. Auth emails (admin signup confirm / password reset) are handled natively by Supabase Auth, not a custom function. Per-function `verify_jwt` set in [supabase/config.toml](supabase/config.toml).
- [supabase/migrations/](supabase/migrations/) - SQL migrations (timestamp-prefixed).
- [scripts/](scripts/) - `deploy-icount-shineon.ps1`, ShineOn test scripts (`shineon-test-order.mjs`, `shineon-test-from-order.ts`), `backfill-svg-asset.ts`, `gen-heartbeat.cjs`.

## Conventions

- Import alias `@/` → `src/` (Vite, vitest, tsconfig).
- TS is loose: `strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals/Parameters: false`, `allowJs` ([tsconfig.json](tsconfig.json)). `@typescript-eslint/no-unused-vars` is off.
- Theme: dark, serif headings (Playfair Display), sans body (Inter).
- **Brand copy is universal memorial, NOT pet-specific.** Never use "Dog Tag", "Pet Name", "Pet Photo", "Pet" in UI copy - use "Memory Pendant", "Name", "Memory Photo". DB columns `pet_name`/`pet_photo_url` keep old names for back-compat; UI shows universal terms.
- Soul Page / QR links: `https://animuswaves.com/soul/[UUID]`.
- Storage buckets: `soul_assets`, `production_assets`.

## Pitfalls

- Env: frontend needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` ([.env.example](.env.example)) - VITE_ vars are browser-exposed, public values only. Function secrets are separate ([supabase/functions/.env.example](supabase/functions/.env.example)): `ICOUNT_API_TOKEN`, `ICOUNT_WEBHOOK_SECRET`, `SHINEON_API_KEY`, etc.
- Linked Supabase project ref = `xypwhiidgcjlooorohli` (config.toml + `supabase/.temp/project-ref`). [scripts/deploy-icount-shineon.ps1](scripts/deploy-icount-shineon.ps1) hardcodes a DIFFERENT ref (`gcqmkltyifgtuizencka`) - verify before running a deploy.
- iCount webhook auth = `ICOUNT_WEBHOOK_SECRET` echoed in header `X-iCount-Secret`; if unset the webhook accepts any caller (dev only).
- ShineOn prints from a 1000x1788 SVG asset only (PNG returns 406). 4 hardcoded variant SKUs in [src/config/product.ts](src/config/product.ts) (steel/gold × plain/engraved).
- Don't edit `src/integrations/supabase/client.ts` / `types.ts` by hand - generated.
