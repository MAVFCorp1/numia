# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

NUMIA — a personal/SME finance copilot for Ecuador ("Tu copiloto financiero para toda Latinoamérica"). Users upload bank statements and SRI (Ecuador's tax authority) invoice XMLs; the app categorizes transactions, tracks deductible expenses, computes IVA (VAT) and financial ratios, and surfaces AI-generated alerts/suggestions.

## Stack

- **Next.js 16** (App Router), **React 19** — all client components (`'use client'`), no server components/actions in `app/`.
- **JavaScript only — never TypeScript.** No `.ts`/`.tsx` files, no type annotations. `jsconfig.json` defines the `@/*` path alias to the repo root.
- **Tailwind CSS 4** (via `@tailwindcss/postcss`, `@import "tailwindcss"` in `app/globals.css`) — styling is done with inline Tailwind utility classes computed per-component based on a `tema`/`darkMode` state (see Theming below), not CSS modules.
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) for auth and Postgres data. No server-side Supabase client — everything runs client-side via the browser client.
- Other libs: `chart.js`/`react-chartjs-2` (charts), `xlsx` (reading bank statement spreadsheets), `pdf-lib` (PDF report generation).

Since this Next.js version deviates from training data (per AGENTS.md), check `node_modules/next/dist/docs/` for API specifics before relying on framework knowledge.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint (`eslint-config-next/core-web-vitals`)

No test suite is configured in this repo.

## Code rules

- **Never write TypeScript.** All app code is plain JavaScript (`.js` files, including components).
- **Always get the Supabase client via `createClient()` from `@/lib/supabase`** (`lib/supabase.js`, wraps `createBrowserClient`). Never instantiate Supabase another way. Every page that needs auth/data calls `const supabase = createClient()` and reads env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **AI calls go through the `/api/leer-balance` route**, never call the Anthropic API directly from client code. That route (`app/api/leer-balance/route.js`) is a thin proxy: it takes `{ messages }` in the POST body, forwards to `https://api.anthropic.com/v1/messages` using the server-side `ANTHROPIC_API_KEY`, and returns the raw response. Callers build the prompt with `construirPromptSugerencias` (`lib/alertas.js`), POST it, then parse `data.content` (strip markdown fences, `JSON.parse`).
- Auth pattern used on every protected page: `supabase.auth.getUser()` in a `useEffect`, redirect to `/login` if no user (either `router.push` or `window.location.href` — both patterns exist).
- User theme preference (`'oscuro'`/`'claro'`) is persisted per-user in the `preferencias` table and read/written with `.upsert({ user_id, tema }, { onConflict: 'user_id' })`. Pages derive their own Tailwind class strings (`bg`, `card`, `text`, `border`, etc.) from a local `dark`/`darkMode` boolean rather than using Tailwind's `dark:` variant.
- Text is in Spanish (Ecuador), including variable/function names in `lib/` (e.g. `categorizarMovimiento`, `diaDeclaracion`). Keep naming and copy consistent with this convention when adding code.

## Data model (Supabase tables in use)

All queries are scoped with `.eq('user_id', user.id)`. No table types/schemas are checked in — infer shape from usage:

- **`profiles`** — one row per user (`user_id`), onboarding data: business/personal profile, `ruc`, `tipo` (`'persona'` | `'empresa'`), sector, size, plan.
- **`movimientos`** — bank transactions: `fecha`, `descripcion`, `monto`, `tipo` (`'ingreso'`/`'gasto'`), `cuenta`, `categoria`, `nota`. Populated by parsing bank statements (`dashboard/banco`) or from SRI invoices (`dashboard/xmls`).
- **`preferencias`** — per-user settings, keyed by `user_id`; currently just `tema` (`'oscuro'`/`'claro'`).
- **`facturas_sri`** — SRI invoices (compra/venta): `fecha`, `tipo`, RUC emisor, razón social, número, subtotal, subtotal exento, IVA, nota.
- **`deducibles`** — deductible expenses: `fecha`, `descripcion`, `monto`, `categoria`, `nota`, categorized differently for `'persona'` vs `'empresa'` profiles.
- **`reglas_categoria`** — user-defined auto-categorization rules for `movimientos`: `contiene` (keyword) → `categoria`.
- **`presupuestos`** — per-category budgets: `categoria`, `monto`, upserted per `user_id`.

## `lib/` modules

- **`lib/supabase.js`** — the only place Supabase client creation happens (`createClient()`).
- **`lib/categorizador.js`** — rule-based categorizer for bank `movimientos` (regex matching on description text against Ecuadorian merchants/keywords), plus `categoriaInfo` (label/emoji/color) and `todasLasCategorias`.
- **`lib/categorizadorDeducibles.js`** — separate rule-based categorizer for deductible expenses, split by profile type (`categorizarDeduciblePersona` — SRI's 6 official personal deduction categories with annual caps — vs `categorizarDeducibleEmpresa`). Includes a mapping from `movimientos` categories to deducible categories (`mapearCategoriaMovimiento`) used to suggest deducible candidates from already-categorized transactions.
- **`lib/sriHelpers.js`** — SRI tax calendar logic: derives the IVA filing deadline from the 9th digit of a RUC (`diaDeclaracion`, `proximaFechaDeclaracion`), plus IVA math (`calcularIva`, `desglosarIva`) at Ecuador's 15% rate (`TARIFA_IVA`).
- **`lib/alertas.js`** — rule-based alert engine (`generarAlertas`): produces a prioritized list of alerts (upcoming filing, IVA owed, overspending, category spikes, good savings rate, etc.) from a user's movimientos/facturas/deducibles/perfil. Also builds the prompt (`construirPromptSugerencias`) sent through `/api/leer-balance` for AI-generated personalized suggestions.

## Pages (`app/`)

- **`app/page.js`** — public marketing landing page (animated hero, scroll reveals via `IntersectionObserver`, count-up stats). No auth.
- **`app/login/page.js`** / **`app/register/page.js`** — Supabase email/password auth. Login checks for an existing `profiles` row to route to `/dashboard` (has profile) vs `/onboarding` (doesn't).
- **`app/onboarding/page.js`** — post-signup profile setup: sector, business size, plan selection; inserts the `profiles` row.
- **`app/dashboard/page.js`** — main dashboard: greeting, quick ratios, rule-based alerts (`lib/alertas.js`), AI suggestions via `/api/leer-balance`, theme toggle.
- **`app/dashboard/banco/page.js`** — bank statement import (parses uploaded files) and transaction management: list/edit/delete `movimientos`, auto-categorization rules (`reglas_categoria`), budgets (`presupuestos`).
- **`app/dashboard/sri/page.js`** — SRI invoice management (`facturas_sri`) with IVA calendar based on RUC, AI-assisted XML parsing, manual invoice CRUD.
- **`app/dashboard/xmls/page.js`** — bulk SRI XML invoice upload/processing, inserts into both `facturas_sri` and `movimientos`.
- **`app/dashboard/deducibles/page.js`** — deductible expense tracking, categorized per profile type, with sync from existing `movimientos`.
- **`app/dashboard/ratios/page.js`** — financial ratio calculator (liquidity, acid test, debt level, etc.) with traffic-light (verde/amarillo/rojo) thresholds against standard benchmarks; can import balance data from Excel (`xlsx`).
- **`app/api/leer-balance/route.js`** — the sole backend API route; see AI rule above.

## Visual identity

- **Brand gradient**: magenta `#E91E8C` → purple `#9C27B0`, used in `linearGradient`s, radial background accents, and as accent colors throughout (e.g. the `ia`/`sugerencia` alert types in `lib/alertas.js` use these exact hex values).
- **Dark theme by default** on app pages: base background `bg-gray-950`, cards `bg-gray-900 border-gray-800`, primary text `text-gray-100`, secondary `text-gray-400`. Light theme is the toggled alternative (`bg-gray-50` / `bg-white` / `text-gray-900`), not the default — contrast with `app/globals.css`'s root `--background`/`--foreground`, which follows OS `prefers-color-scheme` and is only used for the base document, not the dashboard UI.
- Logo: `public/Logo Numia.png`. Font: Geist Sans/Mono via `next/font/google`.
- Status semantics use a traffic-light convention (`verde`/`amarillo`/`rojo`) mapped to emerald/yellow/red Tailwind colors, applied consistently across ratios and alerts.
