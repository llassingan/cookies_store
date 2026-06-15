import { describe, expect, it } from 'vitest';
import { shouldUseSecureCookie } from '../src/services/auth';

describe('shouldUseSecureCookie', () => {
  it('returns true when the Origin header is https', () => {
    expect(
      shouldUseSecureCookie(
        { origin: 'https://cookies.mahara.web.id:14022', referer: null },
        'http://localhost:14022',
      ),
    ).toBe(true);
  });

  it('returns false when the Origin header is http', () => {
    expect(
      shouldUseSecureCookie(
        { origin: 'http://localhost:14022', referer: null },
        'https://cookies.mahara.web.id:14022',
      ),
    ).toBe(false);
  });

  it('uses Referer when Origin is missing', () => {
    expect(
      shouldUseSecureCookie(
        { origin: null, referer: 'https://example.com/page' },
        'http://localhost:14022',
      ),
    ).toBe(true);
  });

  it('falls back to PUBLIC_BASE_URL when both Origin and Referer are missing', () => {
    expect(shouldUseSecureCookie({ origin: null, referer: null }, 'https://prod.example.com')).toBe(
      true,
    );
    expect(shouldUseSecureCookie({ origin: null, referer: null }, 'http://localhost:14022')).toBe(
      false,
    );
  });

  it('prefers Origin over Referer', () => {
    expect(
      shouldUseSecureCookie(
        { origin: 'http://insecure.example.com', referer: 'https://secure.example.com' },
        'http://localhost:14022',
      ),
    ).toBe(false);
  });
});
