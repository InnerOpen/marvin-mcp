import { describe, expect, it } from 'vitest';
import { normalizeError } from '../src/errors/normalize-error.js';

describe('normalizeError', () => {
  it('maps authentication failures without leaking token text', () => {
    const error = normalizeError(
      Object.assign(new Error('Bearer abc123 unauthorized'), { statusCode: 401 }),
      'Testing',
    );

    expect(error.code).toBe('authentication_failed');
    expect(JSON.stringify(error)).not.toContain('abc123');
  });

  it('maps not found failures', () => {
    expect(
      normalizeError(Object.assign(new Error('missing'), { status: 404 }), 'Testing').code,
    ).toBe('not_found');
  });
});
