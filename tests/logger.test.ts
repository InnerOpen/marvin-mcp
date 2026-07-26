import { describe, expect, it, vi } from 'vitest';
import { createLogger, redact } from '../src/logger.js';

describe('redact', () => {
  it('masks token values in strings', () => {
    expect(redact('token=abc123')).toBe('token=[REDACTED]');
    expect(redact('token: secret.value')).toBe('token=[REDACTED]');
  });

  it('masks authorization and bearer values in strings', () => {
    expect(redact('Authorization=mytoken')).toBe('Authorization=[REDACTED]');
    expect(redact('bearer: abc.def.ghi')).toBe('bearer=[REDACTED]');
  });

  it('masks sensitive keys in objects', () => {
    const result = redact({
      token: 'secret',
      authorization: 'Bearer xyz',
      secret: 'hidden',
      password: 'pass123',
      name: 'safe',
    });

    expect(result).toEqual({
      token: '[REDACTED]',
      authorization: '[REDACTED]',
      secret: '[REDACTED]',
      password: '[REDACTED]',
      name: 'safe',
    });
  });

  it('recurses into arrays', () => {
    expect(redact(['token=abc', 'safe'])).toEqual(['token=[REDACTED]', 'safe']);
  });

  it('recurses into nested objects', () => {
    const result = redact({ outer: { token: 'secret', name: 'ok' } });
    expect(result).toEqual({ outer: { token: '[REDACTED]', name: 'ok' } });
  });

  it('passes through primitives', () => {
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
    expect(redact(true)).toBe(true);
  });
});

describe('createLogger', () => {
  it('writes to stderr for messages at or below threshold', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = createLogger({ logLevel: 'info' });

    logger.error('err msg');
    logger.warn('warn msg');
    logger.info('info msg');

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('err msg'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('warn msg'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('info msg'));

    spy.mockRestore();
  });

  it('suppresses messages above threshold', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = createLogger({ logLevel: 'error' });

    logger.warn('suppressed');
    logger.info('suppressed');
    logger.debug('suppressed');

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('silent level suppresses everything', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = createLogger({ logLevel: 'silent' });

    logger.error('suppressed');
    logger.warn('suppressed');
    logger.info('suppressed');
    logger.debug('suppressed');

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('includes JSON-serialized details when provided', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = createLogger({ logLevel: 'debug' });

    logger.debug('test', { key: 'value' });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('{"key":"value"}'));
    spy.mockRestore();
  });

  it('redacts sensitive data in details', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = createLogger({ logLevel: 'debug' });

    logger.debug('test', { token: 'secret123' });

    const output = spy.mock.calls[0]![0] as string;
    expect(output).not.toContain('secret123');
    expect(output).toContain('[REDACTED]');
    spy.mockRestore();
  });
});
