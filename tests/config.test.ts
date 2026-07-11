import { describe, expect, it } from 'vitest';
import { ConfigurationError, loadConfig, loadCredentials, toSdkConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('validates required Marvin environment variables', () => {
    expect(() => loadConfig({}, {})).toThrow(ConfigurationError);
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

  it('falls back to credentials file for workspaceSlug and siteClientToken', () => {
    const credentials = {
      activeWorkspace: 'my-workspace',
      workspaces: {
        'my-workspace': { siteToken: 'cred_token_123' },
      },
    };

    const config = loadConfig(
      { MARVIN_API_URL: 'https://marvin.example.com' },
      credentials,
    );

    expect(config.workspaceSlug).toBe('my-workspace');
    expect(config.siteClientToken).toBe('cred_token_123');
  });

  it('env vars take precedence over credentials file', () => {
    const credentials = {
      activeWorkspace: 'cred-workspace',
      workspaces: {
        'cred-workspace': { siteToken: 'cred_token' },
      },
    };

    const config = loadConfig(
      {
        MARVIN_API_URL: 'https://marvin.example.com',
        MARVIN_SITE_CLIENT_TOKEN: 'env_token',
        MARVIN_WORKSPACE_SLUG: 'env-workspace',
      },
      credentials,
    );

    expect(config.workspaceSlug).toBe('env-workspace');
    expect(config.siteClientToken).toBe('env_token');
  });

  it('uses workspace slug from env to look up siteToken in credentials', () => {
    const credentials = {
      activeWorkspace: 'other-workspace',
      workspaces: {
        'env-workspace': { siteToken: 'env_ws_token' },
        'other-workspace': { siteToken: 'other_token' },
      },
    };

    const config = loadConfig(
      {
        MARVIN_API_URL: 'https://marvin.example.com',
        MARVIN_WORKSPACE_SLUG: 'env-workspace',
      },
      credentials,
    );

    expect(config.workspaceSlug).toBe('env-workspace');
    expect(config.siteClientToken).toBe('env_ws_token');
  });

  it('includes helpful error messages referencing credentials file', () => {
    try {
      loadConfig({ MARVIN_API_URL: 'https://marvin.example.com' }, {});
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      const message = (error as ConfigurationError).message;
      expect(message).toContain('~/.marvin/credentials.json');
    }
  });

  it('accepts all valid log levels', () => {
    for (const level of ['silent', 'error', 'warn', 'info', 'debug'] as const) {
      const config = loadConfig({
        MARVIN_API_URL: 'https://marvin.example.com',
        MARVIN_SITE_CLIENT_TOKEN: 'token',
        MARVIN_WORKSPACE_SLUG: 'demo',
        MARVIN_MCP_LOG_LEVEL: level,
      });
      expect(config.logLevel).toBe(level);
    }
  });

  it('rejects invalid API URLs', () => {
    expect(() =>
      loadConfig({
        MARVIN_API_URL: 'not-a-url',
        MARVIN_SITE_CLIENT_TOKEN: 'token',
        MARVIN_WORKSPACE_SLUG: 'demo',
      }),
    ).toThrow(ConfigurationError);
  });

  it('readOnly treats "TRUE" (case-insensitive) as true', () => {
    const config = loadConfig({
      MARVIN_API_URL: 'https://marvin.example.com',
      MARVIN_SITE_CLIENT_TOKEN: 'token',
      MARVIN_WORKSPACE_SLUG: 'demo',
      MARVIN_MCP_READ_ONLY: 'TRUE',
    });
    expect(config.readOnly).toBe(true);
  });

  it('readOnly treats non-"true" strings as false', () => {
    const config = loadConfig({
      MARVIN_API_URL: 'https://marvin.example.com',
      MARVIN_SITE_CLIENT_TOKEN: 'token',
      MARVIN_WORKSPACE_SLUG: 'demo',
      MARVIN_MCP_READ_ONLY: 'yes',
    });
    expect(config.readOnly).toBe(false);
  });
});

describe('loadCredentials', () => {
  it('returns empty object for non-existent file', () => {
    const result = loadCredentials('/tmp/nonexistent-marvin-creds.json');
    expect(result).toEqual({});
  });
});

describe('toSdkConfig', () => {
  it('maps config to SDK format', () => {
    const config = loadConfig({
      MARVIN_API_URL: 'https://marvin.example.com',
      MARVIN_SITE_CLIENT_TOKEN: 'token123',
      MARVIN_WORKSPACE_SLUG: 'demo',
    });

    const sdkConfig = toSdkConfig(config);

    expect(sdkConfig).toEqual({
      apiUrl: 'https://marvin.example.com',
      siteClientToken: 'token123',
      workspaceSlug: 'demo',
      autoInitialize: false,
    });
  });
});
