import { describe, expect, it } from 'vitest';
import { normalizeError } from '../src/errors/normalize-error.js';
import { ConfigurationError } from '../src/config.js';
import { MarvinObjectNotFoundError } from '../src/errors/types.js';

describe('normalizeError', () => {
  it('maps ConfigurationError to configuration_error', () => {
    const error = normalizeError(new ConfigurationError('missing vars'), 'Testing');
    expect(error.code).toBe('configuration_error');
    expect(error.message).toBe('missing vars');
    expect(error.suggestion).toContain('MARVIN_API_URL');
  });

  it('maps MarvinObjectNotFoundError to not_found with kind and slug', () => {
    const error = normalizeError(
      new MarvinObjectNotFoundError('entry', 'about'),
      'Testing',
    );
    expect(error.code).toBe('not_found');
    expect(error.message).toContain('entry');
    expect(error.message).toContain('about');
    expect(error.status).toBe(404);
  });

  it('maps 401 status to authentication_failed', () => {
    const error = normalizeError(
      Object.assign(new Error('denied'), { status: 401 }),
      'Testing',
    );
    expect(error.code).toBe('authentication_failed');
    expect(error.status).toBe(401);
  });

  it('maps authentication failures without leaking token text', () => {
    const error = normalizeError(
      Object.assign(new Error('Bearer abc123 unauthorized'), { statusCode: 401 }),
      'Testing',
    );
    expect(error.code).toBe('authentication_failed');
    expect(JSON.stringify(error)).not.toContain('abc123');
  });

  it('maps "unauthorized" message to authentication_failed even without status', () => {
    const error = normalizeError(new Error('request unauthorized'), 'Testing');
    expect(error.code).toBe('authentication_failed');
  });

  it('maps 403 status to authorization_failed', () => {
    const error = normalizeError(
      Object.assign(new Error('no access'), { status: 403 }),
      'Testing',
    );
    expect(error.code).toBe('authorization_failed');
    expect(error.status).toBe(403);
  });

  it('maps "forbidden" message to authorization_failed', () => {
    const error = normalizeError(new Error('forbidden resource'), 'Testing');
    expect(error.code).toBe('authorization_failed');
  });

  it('maps 404 status to not_found', () => {
    expect(
      normalizeError(Object.assign(new Error('missing'), { status: 404 }), 'Testing').code,
    ).toBe('not_found');
  });

  it('maps "workspace" in 404 message to workspace_not_found', () => {
    const error = normalizeError(
      Object.assign(new Error('workspace not found'), { status: 404 }),
      'Testing',
    );
    expect(error.code).toBe('workspace_not_found');
  });

  it('maps NOT_FOUND code to not_found', () => {
    const error = normalizeError(
      Object.assign(new Error('gone'), { code: 'NOT_FOUND' }),
      'Testing',
    );
    expect(error.code).toBe('not_found');
  });

  it('maps 400 status to validation_error', () => {
    const error = normalizeError(
      Object.assign(new Error('bad input'), { status: 400 }),
      'Testing',
    );
    expect(error.code).toBe('validation_error');
    expect(error.status).toBe(400);
  });

  it('maps "validation" message to validation_error', () => {
    const error = normalizeError(new Error('validation failed for field'), 'Testing');
    expect(error.code).toBe('validation_error');
  });

  it('maps "required" message to validation_error', () => {
    const error = normalizeError(new Error('field is required'), 'Testing');
    expect(error.code).toBe('validation_error');
  });

  it('maps timeout/network errors to timeout', () => {
    expect(normalizeError(new Error('request timeout'), 'Testing').code).toBe('timeout');
    expect(normalizeError(new Error('connection aborted'), 'Testing').code).toBe('timeout');
    expect(
      normalizeError(
        Object.assign(new Error('fail'), { code: 'NETWORK_ERROR' }),
        'Testing',
      ).code,
    ).toBe('timeout');
  });

  it('maps 5xx status to marvin_unavailable', () => {
    const error = normalizeError(
      Object.assign(new Error('server error'), { status: 500 }),
      'Testing',
    );
    expect(error.code).toBe('marvin_unavailable');
    expect(error.message).toContain('500');

    const error502 = normalizeError(
      Object.assign(new Error('bad gateway'), { status: 502 }),
      'Testing',
    );
    expect(error502.code).toBe('marvin_unavailable');
  });

  it('falls through to unexpected_response for unknown errors', () => {
    const error = normalizeError(new Error('something weird'), 'Testing');
    expect(error.code).toBe('unexpected_response');
  });

  it('reads status from response.status', () => {
    const error = normalizeError(
      { message: 'nested', response: { status: 401 } },
      'Testing',
    );
    expect(error.code).toBe('authentication_failed');
  });

  it('reads statusCode property', () => {
    const error = normalizeError(
      Object.assign(new Error('denied'), { statusCode: 403 }),
      'Testing',
    );
    expect(error.code).toBe('authorization_failed');
  });

  it('handles non-Error values', () => {
    const error = normalizeError('string error', 'Testing');
    expect(error.code).toBe('unexpected_response');

    const numError = normalizeError(42, 'Testing');
    expect(numError.code).toBe('unexpected_response');
  });

  it('redacts token values in error messages', () => {
    const error = normalizeError(new Error('token=mysecrettoken123'), 'Testing');
    expect(error.message).not.toContain('mysecrettoken123');
  });

  it('redacts Bearer tokens in error messages', () => {
    const error = normalizeError(
      Object.assign(new Error('Bearer eyJhbGciOiJIUzI1.secret'), { status: 500 }),
      'Testing',
    );
    expect(error.message).not.toContain('eyJhbGciOiJIUzI1');
  });
});

describe('MarvinObjectNotFoundError', () => {
  it('has correct properties', () => {
    const error = new MarvinObjectNotFoundError('collection', 'pages');
    expect(error.kind).toBe('collection');
    expect(error.slug).toBe('pages');
    expect(error.status).toBe(404);
    expect(error.name).toBe('MarvinObjectNotFoundError');
    expect(error.message).toContain('collection');
    expect(error.message).toContain('pages');
  });
});
