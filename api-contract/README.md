# Cookies Shop · API Contract

This is the single source of truth for the HTTP contract between the Next.js
storefront and the Bun + Hono API server. Every request and response shape
is also codified as Zod schemas in `packages/shared/src/*` and used by both
ends at runtime.

The schema files are the canonical machine-readable contract:

| File                       | Subject                                            |
| -------------------------- | -------------------------------------------------- |
| `packages/shared/src/enums.ts`   | `FulfillmentMethod`, `OrderStatus`, `PaymentStatus` |
| `packages/shared/src/common.ts`  | `Money`, `ApiError`, `Pagination`, `IdParam`        |
| `packages/shared/src/menu.ts`    | `MenuItem`, `CreateMenuItemRequest`, `UpdateMenuItemRequest` |
| `packages/shared/src/order.ts`   | `Order`, `OrderItem`, `CreateOrderRequest`, `CartQuote`, `ListOrders*`, `UpdateOrderStatusRequest`, `PaymentWebhookPayload` |
| `packages/shared/src/shop.ts`    | `ShopSettings`, `UpdateShopSettingsRequest`, `GetShopStatusResponse` |
| `packages/shared/src/admin.ts`   | `AdminLogin*`, `SalesSummary`, `BakeNight*`         |

---

## Public routes (no auth)

### `GET /public/menu`
Returns the available menu items.

**Response 200** — `ListMenuItemsResponse`
```json
{ "items": [{ "id": "…", "name": "…", "price": 35000, "available": true, … }] }
```

### `GET /public/shop/status`
Used by the storefront to render the closed banner.

**Response 200** — `GetShopStatusResponse`
```json
{ "isOpen": true, "closedReason": null }
```

### `POST /public/cart/quote`
Pre-checkout capacity + price preview. Re-runs the capacity engine so the
storefront can show the same estimate the server will use when the order is
finally placed.

**Body** — `QuoteCartRequest`
```json
{
  "items": [{ "menuItemId": "…", "quantity": 2 }],
  "fulfillment": "pickup"
}
```

**Response 200** — `CartQuote`
```json
{
  "items": [{ "menuItemId": "…", "name": "…", "unitPrice": 35000, "quantity": 2, "subtotal": 70000 }],
  "subtotal": 70000,
  "deliveryFee": 0,
  "total": 70000,
  "earliestBakeDate": "2026-06-15",
  "estimatedReadyDate": "2026-06-15",
  "estimatedReadyAt": "2026-06-15T03:00:00.000Z",
  "crossesCutoff": false,
  "blockedReason": null
}
```

**Errors**:
- `400 invalid_menu_items` — one or more `menuItemId` is unknown
- `409 fully_booked` — no open day inside the queue window has room
- `409 shop_closed` — admin has set `isOpen = false`

### `POST /public/orders`
Creates a new order in `awaiting_payment` status and returns a mock payment
URL the user can be redirected to.

**Body** — `CreateOrderRequest` (same as quote, plus `customer` and an
optional `idempotencyKey`).
```json
{
  "items": [{ "menuItemId": "…", "quantity": 3 }],
  "fulfillment": "pickup",
  "customer": { "name": "Sasha", "email": "sasha@x.co", "phone": "08123…" },
  "idempotencyKey": "ck_…"
}
```

**Response 200** — `CreateOrderResponse`
```json
{
  "orderId": "…",
  "orderNumber": "CK20260614-001",
  "total": { "amount": 105000, "currency": "IDR" },
  "estimatedReadyAt": "2026-06-15T03:00:00.000Z",
  "paymentUrl": "http://localhost:3030/mock-pay/pay_…",
  "paymentReference": "pay_…"
}
```

### `GET /public/orders/:id`
Fetches an order by UUID **or** by order number. Used by both the
thank-you page and the order tracking page.

**Response 200** — `Order`
**Response 404** — `{ "error": { "code": "not_found", … } }`

### `POST /webhooks/payment/mock`
In dev, the “payment gateway” is the storefront’s mock button. It POSTs
`PaymentWebhookPayload` here to confirm the payment.

**Body** — `PaymentWebhookPayload`
```json
{ "reference": "pay_…", "status": "paid" }
```

On `paid`, the API marks the order `queued` and emails the customer
(into `tmp/emails/` in dev). On `failed` or `expired`, the order is
cancelled.

---

## Admin routes (cookie session, `Set-Cookie: cookies_admin_session`)

All admin endpoints return `401 unauthorized` when no valid session cookie
is presented.

### `POST /admin/auth/login`
**Body** — `AdminLoginRequest`
**Response 200** — `{ "ok": true }`, sets session cookie.
**Response 401** — `{ "error": { "code": "invalid_credentials" } }`

### `POST /admin/auth/logout`
Clears the session cookie.

### `GET /admin/auth/me`
Returns `{ "username": "admin" }` when signed in.

### Menu CRUD
- `GET    /admin/menu`            — full menu, including hidden items
- `POST   /admin/menu`            — create item (`CreateMenuItemRequest`)
- `PATCH  /admin/menu/:id`        — partial update (`UpdateMenuItemRequest`)
- `DELETE /admin/menu/:id`        — delete item

### Order management
- `GET    /admin/orders`              — paginated, optional `?status=…&fromDate=…&toDate=…&page=…&pageSize=…`
- `GET    /admin/orders/:id`          — full order
- `PATCH  /admin/orders/:id/status`   — `UpdateOrderStatusRequest` (one of `queued|baking|ready|completed|cancelled`)

Status transitions enforced by the API:

```
awaiting_payment → cancelled
paid             → queued → baking → ready → completed
                  └────────┴────────┴──────→ cancelled
```

### Dashboard
- `GET /admin/dashboard/sales`        — `SalesSummary` (last 7 days)
- `GET /admin/dashboard/bake-nights`  — `BakeNightsResponse` (next maxQueueDays + 1 days)

### Settings
- `GET  /admin/settings`        — `ShopSettings`
- `PATCH /admin/settings`      — `UpdateShopSettingsRequest`

---

## Capacity & scheduling rules

`capacity.ts::planCapacity` is the only place that decides which bake date an
order lands on. The rules, in priority order:

1. A bake day is *closed* if its ISO date is in `shop_settings.closedDates` or
   it falls on a Sunday.
2. The earliest candidate is `today + 1` if the order is placed *before*
   `orderCutoffHour` (in shop timezone), otherwise `today + 2`.
3. The candidate is rolled forward to the next open day.
4. The order fits if `used + quantity <= dailyCapacity` for that day.
5. If no open day within `maxQueueDays + 1` candidates has room, the order is
   `blocked` with a "fully booked" reason.

The `estimatedReadyAt` is `bakeDate @ 10:00 shop-tz` (best effort — the real
ready time depends on bake progress).

---

## Error envelope

Every non-2xx response uses:
```json
{ "error": { "code": "string", "message": "string", "details": { … } } }
```

Common codes: `validation_error`, `not_found`, `unauthorized`,
`invalid_credentials`, `invalid_menu_items`, `shop_closed`, `fully_booked`,
`invalid_transition`, `internal_error`.
