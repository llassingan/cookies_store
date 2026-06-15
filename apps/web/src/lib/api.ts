import type { ApiError } from '@cookies/shared';

const baseUrl = process.env.WEB_API_URL ?? 'http://localhost:14045';

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
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

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};
