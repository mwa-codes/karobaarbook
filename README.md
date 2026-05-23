# KarobaarBook — Phase 1.5 (Khata + Roznamcha)

> **Apna Karobaar, Digital Register.**
> A mobile-first PWA for small factory owners and manufacturers in Pakistan to
> replace manual paper registers (khata, karigar wages, expenses).

Phase 1 shipped the **Khata** module. Phase 1.5 layers on:

- **Payment mode** (cash / bank / cheque / other) and **transaction category**
  (sale / purchase / payment received / payment made / other) per transaction
- **Running-balance ledger** on every party page
- **Roznamcha** — a daily cash book with opening / closing balances, income
  vs. expense entries, and per-day navigation
- Design overhaul: gradient brand header, phone-frame desktop layout, redesigned
  party cards with colored left borders, and unified `Rs. 1,00,000` formatting

---

## Tech stack

- **Next.js 14** (App Router, TypeScript, strict mode)
- **Supabase** — Postgres + Auth + Realtime + Row Level Security
- **`@supabase/ssr`** for browser + server + middleware auth (the modern
  replacement for the now-deprecated `@supabase/auth-helpers-nextjs`)
- **Tailwind CSS** with a small custom design system
- **next-pwa** for installable PWA + offline shell
- **Vercel** for hosting

> Note on the Supabase package choice: the original spec referenced
> `@supabase/auth-helpers-nextjs`, but that package is deprecated and its types
> are incompatible with current `@supabase/supabase-js` (`Schema` collapses to
> `never` on `.insert()` / `.update()`). `@supabase/ssr` is Supabase's
> officially recommended replacement and is used here. The cookie-driven session
> flow is unchanged.

## Project layout

```
app/
  (auth)/login, register          ← Public auth flows
  (dashboard)/
    layout.tsx                    ← Auth-guarded shell + BottomNav
    dashboard/                    ← Summary cards + recent transactions
    khata/                        ← Party list, party detail, new party
  layout.tsx                      ← Root shell + ToastProvider
  page.tsx                        ← Redirects to /dashboard or /login

components/
  ui/      Button, Input, Card, BottomSheet, Modal, Toast, Icons, …
  layout/    Header, BottomNav
  khata/     PartyCard, TransactionRow, AddPartyForm, AddTransactionForm
  roznamcha/ DailySummary, EntryCard, AddEntryForm, DateNavigator,
             OpeningBalanceEditor

hooks/     useAuth, useParties, useTransactions (with realtime subscriptions)
lib/       supabase clients, format helpers (Pakistani digit grouping)
types/     database.ts (typed Supabase schema)
supabase/  schema.sql (run this once to set up DB)
middleware.ts ← auth-protects /dashboard/** and /khata/**
```

---

## 1. Setup Supabase

1. Create a project at <https://supabase.com>.
2. Open the SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql).
   This creates:
   - `profiles`, `parties`, `transactions`, `roznamcha`,
     `daily_opening_balance` tables
   - `party_type`, `transaction_type`, `payment_mode`,
     `transaction_category`, `roznamcha_type` enums
   - The `party_balances` view (with `security_invoker = on` so RLS applies)
   - Row Level Security policies — every row scoped to `auth.uid()`
   - A trigger that auto-creates a `profiles` row on signup
   - Realtime publications for every table

   If you already ran the Phase 1 schema, run the incremental migration at
   [`supabase/migrations/2025_phase_1_5.sql`](./supabase/migrations/2025_phase_1_5.sql)
   instead — it adds only the new columns / tables and is safe to re-run.
3. In **Authentication → Providers**, keep **Email** enabled.

   **Email confirmation (recommended for production):** leave **Confirm email**
   on. After signup, users land on `/auth/confirmed` with a clear success message.

   **URL configuration** (Authentication → URL Configuration):

   - **Site URL:** your production URL (e.g. `https://your-app.vercel.app`)
   - **Redirect URLs:** add both:
     - `http://localhost:3000/auth/callback`
     - `https://your-app.vercel.app/auth/callback`

   Set `NEXT_PUBLIC_SITE_URL` in `.env.local` / Vercel to the same origin you use
   in Supabase (local: `http://localhost:3000`).

   **Custom verification email** (Authentication → Email Templates → **Confirm signup**):

   - **Subject:** `KarobaarBook — Apna email verify karein`
   - **Body (example):**

   ```html
   <h2>KarobaarBook</h2>
   <p>Shukriya — aapne account banaya hai.</p>
   <p>Neeche button dabayein apna email confirm karne ke liye:</p>
   <p><a href="{{ .ConfirmationURL }}">Email verify karein</a></p>
   <p style="color:#666;font-size:14px;">
     Yeh email KarobaarBook (Apna Karobaar, Digital Register) ki taraf se bheji gayi hai.
     Agar aapne account nahi banaya, is email ko ignore karein.
   </p>
   ```

   For the smoothest local demo only, you can turn **off** "Confirm email" so new
   signups can log in immediately without checking inbox.

## 2. Local environment

Copy the example file and fill in your project's keys (Project settings → API):

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
```

## 3. Install + run

```bash
npm install
npm run dev
```

App runs at <http://localhost:3000>. Open it from a phone on the same LAN
(`http://<your-mac-ip>:3000`) to feel the mobile UX — it's designed for 375px.

## 4. Production build

```bash
npm run build
npm run start
```

`next-pwa` is **disabled in development** (per `next.config.js`) and enabled in
production, so the service worker is generated only by `next build`.

## 5. Deploy to Vercel

1. Push the repo to GitHub.
2. Import it in Vercel.
3. In **Project Settings → Environment Variables**, add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Production + Preview).
4. Deploy. Open the URL on Android Chrome → menu → **Install app**. KarobaarBook
   will install as a standalone PWA with its own icon.

---

## Data model

| Table          | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `profiles`     | Per-user profile (full name, factory name, phone, city)          |
| `parties`      | Customers / vendors / both — your khata contacts                 |
| `transactions` | Lena (receivable) or dena (payable) entries per party            |
| `party_balances` | View: per-party `total_lena`, `total_dena`, `net_balance` (live) |

Every Supabase query in the app filters by `owner_id = auth.uid()` and RLS
enforces it server-side too — so **one user can never see another user's data**.

---

## Key features in Phase 1

- Email/password auth via Supabase, with middleware-protected routes
- Add / edit / delete parties (customer, vendor, or both)
- Add / edit / delete transactions (lena or dena)
- Live `party_balances` view + realtime channels → balances update instantly
- Pakistani digit grouping (`1,23,456` not `123,456`) via `lib/format.ts`
- Mobile-first design: 480px max app shell, large tap targets, bottom nav,
  floating action button, bottom-sheet forms
- Empty / loading / error states for every async surface
- Installable PWA with manifest + icons (SVG + generated PNGs)

## Definition of Done — Phase 1

- [x] User can register and login
- [x] User can add a customer or vendor
- [x] User can view all parties with live balances
- [x] User can add lena/dena transactions
- [x] User can edit a transaction
- [x] User can delete a transaction (with confirmation)
- [x] Balance updates instantly after transaction (Supabase realtime)
- [x] App installable on Android phone as PWA
- [x] All data is private per user (RLS + owner_id filters on every query)
- [x] Works smoothly on mobile screens (designed for 375px+)
- [x] Deployable to Vercel with Supabase

## Scripts

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Next.js dev server (PWA disabled)               |
| `npm run build`   | Production build (generates PWA service worker) |
| `npm run start`   | Run the production build                        |
| `npm run lint`    | Run `next lint`                                 |
| `npm run type-check` | Strict TypeScript check                      |

## Not in Phase 1 (intentionally)

These are designed for in the DB but not built as UI yet:

- Karigar / employee management + wages
- Inventory / stock
- Expenses
- Reports & graphs
- WhatsApp share / PDF export
- Urdu language toggle

The data model and routes (`/karigar`, `/more`) are stubbed in the bottom nav
so users see them as **"coming soon"** today.

---

## License

Private — for KarobaarBook team use.
