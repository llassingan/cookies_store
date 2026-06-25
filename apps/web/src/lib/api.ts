/**
 * Maison Croûte — Frontend API Client
 *
 * A thin, typed wrapper around the browser's native `fetch()` function. Every
 * server request in the Next.js storefront (menu listing, cart quoting, order
 * placement, admin actions) flows through this module instead of calling
 * `fetch` directly.
 *
 * Why it exists:
 * — The Hono API runs on port 14045 while the web frontend runs on port 14022.
 *   This module prepends the correct API base URL so callers only need to pass
 *   a relative path (e.g. `/public/menu`).
 * — It automatically serializes request bodies to JSON and deserializes
 *   responses, so callers always deal with typed objects.
 * — When the API returns a non-2xx status, the response body is parsed against
 *   the shared `ApiError` schema and a typed `ApiClientError` is thrown.
 *   Callers can inspect `error.code` to decide what to show the user.
 * — Every request includes `credentials: 'include'` so browser cookies
 *   (the admin session JWT) are sent to the API automatically.
 * — Cache is set to `'no-store'` so the storefront always shows fresh data
 *   (important for a shop where capacity fills up quickly).
 */

import type { ApiError } from '@cookies/shared';

// The base URL of the Hono API server. In development it defaults to
// localhost:14045; in production it comes from the WEB_API_URL env var.
const baseUrl = process.env.WEB_API_URL ?? 'http://localhost:14045';

/**
 * A typed error thrown by {@link request} when the API returns a non-2xx
 * response. Carries the HTTP status, a machine-readable error code (from the
 * shared `ApiError` schema), a human-readable message, and optional details.
 *
 * Components and pages catch this error to show context-sensitive feedback.
 * For example, a `fully_booked` code on checkout means "no more slots today"
 * while an `invalid_credentials` code on login means "wrong username/password".
 */
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Core request function used by all HTTP method wrappers below.
 *
 * 1. Resolves the full URL — if `path` already starts with "http" (e.g. an
 *    absolute URL for payment redirects), it's used as-is; otherwise the
 *    API base URL is prepended.
 * 2. If a request body is present and no Content-Type header was set by the
 *    caller, it defaults to `application/json`.
 * 3. `credentials: 'include'` sends browser cookies (the admin session JWT)
 *    along with every request.
 * 4. `cache: 'no-store'` prevents stale data — critical for the cookie shop
 *    where capacity and menu availability change frequently.
 * 5. On a non-2xx response, the body is parsed against the shared `ApiError`
 *    shape and thrown as an `ApiClientError` so callers get structured error
 *    info (code, message, details) instead of a generic failure.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Build the full URL: absolute URLs pass through unchanged; relative
  // paths get the API base URL prepended.
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const headers = new Headers(init.headers);

  // Auto-detect JSON bodies: if the caller provides a body but didn't
  // explicitly set a Content-Type, assume JSON.
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  // Read the response body once as text, then parse if non-empty.
  // Some endpoints (302 redirects, 204 No Content) return empty bodies.
  const text = await res.text();
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    // The API returns errors in the shape { error: { code, message, details } }
    // as defined by the shared `ApiError` Zod schema.
    const err = data as { error?: ApiError['error'] } | null;
    throw new ApiClientError(
      res.status,
      err?.error?.code ?? 'unknown_error',
      err?.error?.message ?? 'Request failed',
      err?.error?.details,
    );
  }

  return data as T;
}

/**
 * Public API surface: typed HTTP method wrappers.
 *
 * Each method delegates to {@link request} and provides a convenient shorthand
 * so callers never have to manually set the method or serialize JSON.
 *
 * Usage examples:
 *   api.get('/public/menu')                  — fetch the cookie menu
 *   api.post('/public/orders', { ... })      — place an order
 *   api.patch('/admin/menu/item-123', { ... }) — update a menu item
 *   api.delete('/admin/menu/item-123')       — remove a menu item
 */
export const api = {
  /** GET request — fetches data (menu, order details, shop status). No body. */
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),

  /** POST request — creates new resources (orders, login). Body is JSON-serialized. */
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  /** PATCH request — partially updates resources (menu items, settings). */
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  /** DELETE request — removes resources (menu items during admin cleanup). */
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};
