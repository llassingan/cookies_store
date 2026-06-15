import { describe, expect, it } from 'vitest';
import { matchOrigin } from '../src/lib/cors';

describe('cors origin matcher', () => {
  const patterns = [
    'http://localhost:14022',
    'http://127.0.0.1:14022',
    'https://*.mahara.web.id:14022',
    'https://*.mahara.web.id',
  ];

  it('matches an exact origin', () => {
    expect(matchOrigin('http://localhost:14022', patterns)).toBe('http://localhost:14022');
  });

  it('matches a single-level wildcard subdomain with port', () => {
    expect(matchOrigin('https://cookies.mahara.web.id:14022', patterns)).toBe(
      'https://cookies.mahara.web.id:14022',
    );
    expect(matchOrigin('https://xyz.mahara.web.id:14022', patterns)).toBe(
      'https://xyz.mahara.web.id:14022',
    );
  });

  it('matches a single-level wildcard subdomain without port', () => {
    expect(matchOrigin('https://cookies.mahara.web.id', patterns)).toBe(
      'https://cookies.mahara.web.id',
    );
  });

  it('rejects origins not in the allowlist', () => {
    expect(matchOrigin('https://evil.example.com', patterns)).toBeNull();
    expect(matchOrigin('http://localhost:3000', patterns)).toBeNull();
  });

  it('does not match a deeper subdomain with single *', () => {
    expect(matchOrigin('https://a.b.mahara.web.id:14022', patterns)).toBeNull();
  });

  it('rejects a different scheme', () => {
    expect(matchOrigin('http://cookies.mahara.web.id:14022', patterns)).toBeNull();
  });

  it('rejects when port differs from pattern', () => {
    expect(matchOrigin('https://cookies.mahara.web.id:9999', patterns)).toBeNull();
  });
});
