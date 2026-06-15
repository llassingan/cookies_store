/**
 * Origin matcher for the CORS allowlist. Each pattern in `patterns` may be
 * a literal origin (e.g. `https://app.example.com:14022`) or may contain a
 * single `*` wildcard in the host portion (e.g. `https://*.mahara.web.id`)
 * which matches exactly one subdomain label.
 *
 * Returns the origin itself on a match (so Hono's CORS middleware will echo
 * it back in `Access-Control-Allow-Origin`), or `null` to reject.
 */
export function matchOrigin(origin: string, patterns: ReadonlyArray<string>): string | null {
  for (const pattern of patterns) {
    if (pattern === origin) return origin;
    if (!pattern.includes('*')) continue;
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[A-Za-z0-9-]+');
    const re = new RegExp(`^${escaped}$`);
    if (re.test(origin)) return origin;
  }
  return null;
}
