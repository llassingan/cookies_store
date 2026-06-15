import { describe, expect, it } from 'vitest';
import { isUuid } from '../src/lib/uuid';

describe('isUuid', () => {
  it('accepts a standard v4 UUID', () => {
    expect(isUuid('80ff1c3f-137e-44f4-b94c-8381676239de')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isUuid('80FF1C3F-137E-44F4-B94C-8381676239DE')).toBe(true);
  });

  it('rejects order numbers like CK…', () => {
    expect(isUuid('CK20260614-001')).toBe(false);
  });

  it('rejects empty and short strings', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid('123')).toBe(false);
  });

  it('rejects UUIDs of the wrong length', () => {
    expect(isUuid('80ff1c3f-137e-44f4-b94c-8381676239d')).toBe(false);
  });
});
