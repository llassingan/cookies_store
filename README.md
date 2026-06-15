# Maison Croûte · Cookies Shop

A small-batches cookie e-commerce built with **Bun**, **Next.js 15**,
**Hono**, **PostgreSQL** + **Drizzle**, and **shadcn-style Tailwind UI**.

> A small home bakery mixing European-style cookies one tray at a time.
> Customers order before 5pm, we bake the next morning, ready after 10am.

The codebase is a Bun workspace monorepo:

```
prj1/
├── apps/
│   ├── api/        Hono API server (Bun runtime)
│   └── web/        Next.js 15 storefront + admin
├── packages/
│   └── shared/     Zod schemas + types (the API contract)
├── api-contract/   Human-readable contract doc
├── db/             Migration output goes here
├── scripts/        Dev orchestrator
├── biome.json      Lint + format
├── tsconfig.base.json
└── docker-compose.yml
```

---

## Quick start

```bash
# 1. Start Postgres (uses docker-compose.yml at the root)
docker compose up -d

# 2. Install dependencies (Bun workspace)
bun install

# 3. Run dev: migrates, seeds, then starts API + Web
bun run dev
```

`bun run dev` is the single command you need. It:

1. Runs `apps/api/src/db/seed.ts` → idempotently applies migrations and
   inserts the admin user, default shop settings, and 5 sample cookies.
2. Starts the Hono API on `http://localhost:14045` (overridable via `API_PORT`).
3. Starts Next.js on `http://localhost:14022` (overridable via `WEB_PORT`).

The web app talks to the API via Next.js rewrites (`/api/*` → the `WEB_API_URL`).

### Default ports

| Service  | Port  | Why                                            |
| -------- | ----- | ---------------------------------------------- |
| API      | 14045 | Free; 3000/3001 are occupied on this host      |
| Web      | 14022 | Free; 3000/3001 are occupied on this host      |

Both are env-overridable. If you are serving the web on a public subdomain
(e.g. `https://subdomain.mahara.web.id:14022`), put that origin in
`CORS_ORIGINS` (comma-separated) and set `PUBLIC_BASE_URL` / `WEB_API_URL`
to the matching URLs — see `.env.example` for details.

### Default admin login

```
username: admin
password: admin1234
```

Defined in `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). Override in
production.

---

## Quality gates

| Command        | What it runs                                       |
| -------------- | -------------------------------------------------- |
| `bun run lint` | Biome (lint + format) over the whole monorepo      |
| `bun run typecheck` | `tsc --noEmit` in `@cookies/shared`, `@cookies/api`, `@cookies/web` |
| `bun run test`  | Vitest in `@cookies/api` (capacity engine + Zod schemas) |
| `bun run ci`   | Lint + typecheck + test, in order. Fails fast.     |

All three packages have **strict TypeScript** (`noUncheckedIndexedAccess`,
`noImplicitOverride`, `noPropertyAccessFromIndexSignature`, etc.) and
Biome runs with `noExplicitAny`, `noNonNullAssertion`, and a long list of
safety rules.

---

## Customer flow

1. `/` — Hero + today's menu (server-rendered from the API).
2. `/cart` — Adjust quantities, choose pickup/delivery, see live quote.
3. `/checkout` — Contact form, summary, place order.
4. `/order/[id]` — Thank you page with order number; in dev, click
   *“Simulate successful payment”* to fire the mock webhook.
5. `/order/track?ref=CK…` — Look up an order by its number.

## Admin flow

- `/admin` — Sales KPIs, upcoming bake nights, recent orders.
- `/admin/orders` — Searchable, filterable list; open an order to change
  its bake-night status (`queued` → `baking` → `ready` → `completed`,
  or `cancelled` at any point).
- `/admin/menu` — Add, edit, retire cookies. Only `available: true`
  items appear on the storefront.
- `/admin/settings` — Daily capacity, cutoff hour, max queue days,
  delivery fee, closed dates, master open/close.

---

## Capacity & queue rules

The single source of truth is `apps/api/src/services/capacity.ts`. It
encodes the spec from `skema.md`:

- **20 cookies/day** by default (configurable).
- Orders placed **before 5pm** in the shop timezone are processed today
  and ready **tomorrow (H+1)**.
- Orders placed **after 5pm** are processed the next working day and
  ready **the day after (H+2)**.
- If today's queue is full, the order is rolled forward to the next
  open day that has room.
- **Closed dates** and **Sundays** are skipped automatically.
- Maximum lookahead is `maxQueueDays` (default 3, i.e. up to 60 cookies
  in the queue). Beyond that, the order is rejected with `fully_booked`.

The engine is unit-tested (`apps/api/tests/capacity.test.ts`) for the
core scenarios.

---

## Payment (mocked in dev)

The real gateway is `mayar.id` (per `skema.md`). In dev we set
`PAYMENT_PROVIDER=mock` and the order's `paymentUrl` is a local
`/mock-pay/{paymentReference}` page. Clicking *“Simulate successful
payment”* on the thank-you page POSTs to
`/webhooks/payment/mock`, which calls the same `handlePaymentWebhook`
path the real gateway would. Set `PAYMENT_PROVIDER=mayar` and add
`PAYMENT_API_KEY` / `PAYMENT_WEBHOOK_SECRET` to wire up the real provider.

## Email (mocked in dev)

`EMAIL_PROVIDER=mock` writes each order confirmation into
`tmp/emails/{timestamp}__{email}.txt`. Set `EMAIL_PROVIDER=smtp` or
`resend` and provide the appropriate env vars for production.

---

## Project structure (BE)

```
apps/api/src/
├── app.ts                  Hono app factory (cors, error handler)
├── env.ts                  Zod-validated process.env
├── index.ts                Bun.serve entry
├── db/
│   ├── client.ts           Drizzle client (postgres-js)
│   ├── schema.ts           Table definitions
│   ├── migrate.ts          Migration runner
│   ├── seed.ts             Idempotent seed (admin, settings, menu)
│   └── reset.ts            Drop+recreate public schema
├── lib/
│   └── dotenv.ts           .env loader used by every entry point
├── routes/
│   ├── public.ts           /public/* (menu, cart/quote, orders, shop/status)
│   ├── admin.ts            /admin/* (auth, menu, orders, dashboard, settings)
│   └── payment-webhook.ts  /webhooks/payment/{mock,mayar}
└── services/
    ├── capacity.ts         The bake-date planning engine
    ├── order.ts            Order lifecycle + state machine
    ├── menu.ts             Menu CRUD
    ├── settings.ts         Shop settings
    ├── auth.ts             Admin login + JWT cookie sessions
    ├── payment.ts          Webhook handler + payment intent
    └── email.ts            Mock email file-writer
```

## Project structure (FE)

```
apps/web/src/
├── app/
│   ├── layout.tsx                  Root layout, fonts, header, footer
│   ├── page.tsx                    Storefront home
│   ├── cart/page.tsx               Cart + fulfillment toggle
│   ├── checkout/page.tsx           Customer info form
│   ├── order/[id]/page.tsx         Thank-you + simulate-pay
│   ├── order/track/page.tsx        Order tracking
│   ├── admin/                      Admin (gated)
│   │   ├── layout.tsx              Admin chrome + sign-in state
│   │   ├── page.tsx                KPIs + bake nights
│   │   ├── login/page.tsx          Sign in
│   │   ├── orders/page.tsx         Orders list + status dialog
│   │   ├── menu/page.tsx           Menu CRUD
│   │   ├── settings/page.tsx       Shop settings form
│   │   └── …
│   └── api/admin/logout/route.ts   Server-side sign-out
├── components/                     Site chrome, hero, menu cards, ui/*
├── lib/api.ts                      Typed `fetch` wrapper
├── lib/utils.ts                    cn(), formatRupiah(), formatters
├── store/cart.ts                   Zustand cart (localStorage-persisted)
└── styles/globals.css              Tailwind + design tokens
```

---

## Scripts

| From the root           | What it does                                |
| ----------------------- | ------------------------------------------- |
| `bun run dev`           | Migrate + seed + run API + run Web          |
| `bun run dev:api`       | Run only the API                            |
| `bun run dev:web`       | Run only the Web                            |
| `bun run build`         | Build the Next.js app                       |
| `bun run start`         | Start the API in production                 |
| `bun run db:generate`   | `drizzle-kit generate` (after schema change)|
| `bun run db:migrate`    | Apply pending migrations                    |
| `bun run db:seed`       | Apply migrations + run the seed             |
| `bun run db:reset`      | Drop & recreate the public schema           |
| `bun run lint`          | Biome (lint + format check)                 |
| `bun run lint:fix`      | Auto-fix lint + format                      |
| `bun run typecheck`     | Strict TS check across all 3 packages       |
| `bun run test`          | Vitest in `@cookies/api`                    |
| `bun run ci`            | Lint + typecheck + test                     |
