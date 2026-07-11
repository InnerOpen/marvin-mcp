import { describe, expect, it } from 'vitest';
import { ConfigurationError, loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('validates required Marvin environment variables', () => {
    expect(() => loadConfig({})).toThrow(ConfigurationError);
  });

  it('defaults to read-only mode', () => {
    const config = loadConfig({
      MARVIN_API_URL: 'https://marvin.example.com',
      MARVIN_SITE_CLIENT_TOKEN: 'token',
      MARVIN_WORKSPACE_SLUG: 'demo',
    });

    expect(config.readOnly).toBe(true);
    expect(config.logLevel).toBe('warn');
  });

  it('parses explicit read-write mode', () => {
    const config = loadConfig({
      MARVIN_API_URL: 'https://marvin.example.com',
      MARVIN_SITE_CLIENT_TOKEN: 'token',
      MARVIN_WORKSPACE_SLUG: 'demo',
      MARVIN_MCP_READ_ONLY: 'false',
    });

    expect(config.readOnly).toBe(false);
  });
});
