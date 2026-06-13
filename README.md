# ANIMUS

Single-product e-commerce store (US market) for **The Universal Memorial Pendant** - a laser-engraved soundwave dog-tag pendant with a scannable QR "Soul Page". Brand domain: animuswaves.com.

## Stack

Vite + React 18 + TypeScript + shadcn/ui (Radix) + Tailwind. Routing: react-router-dom v6. Data: @tanstack/react-query + zustand. Forms: react-hook-form + zod. Backend: Supabase (Postgres + Edge Functions, Deno). Payments: iCount. Fulfillment: ShineOn. Email: Resend.

## Commands

- `npm run dev` - Vite dev server on port 8080
- `npm run build` - production build (`build:dev` for development mode)
- `npm run lint` - ESLint
- `npm test` - Vitest run (`test:watch` for watch)
- `npm run preview` - preview the built site

E2E: `npx playwright test` (Playwright; tests live under `e2e/`).

See [CLAUDE.md](CLAUDE.md) for architecture, layout, conventions, and pitfalls.
