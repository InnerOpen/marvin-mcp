import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
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

    const config = loadConfig({ MARVIN_API_URL: 'https://marvin.example.com' }, credentials);

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

describe('loadConfig stored credentials', () => {
  const env = { MARVIN_WORKSPACE_SLUG: 'demo', MARVIN_API_URL: 'https://env.example.com' };
  const base = { workspaces: { demo: { siteToken: 'site' } } };

  it('falls back to the top-level userToken saved by the CLI', () => {
    const config = loadConfig(env, { ...base, userToken: 'top-user' });
    expect(config.userToken).toBe('top-user');
  });

  it('prefers the per-workspace userToken over the top-level one', () => {
    const config = loadConfig(env, {
      userToken: 'top-user',
      workspaces: { demo: { siteToken: 'site', userToken: 'ws-user' } },
    });
    expect(config.userToken).toBe('ws-user');
  });

  it('prefers stored userToken over MARVIN_USER_TOKEN, which remains the last fallback', () => {
    const withEnv = { ...env, MARVIN_USER_TOKEN: 'env-user' };
    expect(loadConfig(withEnv, { ...base, userToken: 'top-user' }).userToken).toBe('top-user');
    expect(loadConfig(withEnv, base).userToken).toBe('env-user');
    expect(loadConfig(env, base).userToken).toBeUndefined();
  });

  it('falls back to the top-level apiUrl when MARVIN_API_URL is unset', () => {
    const config = loadConfig(
      { MARVIN_WORKSPACE_SLUG: 'demo' },
      { ...base, apiUrl: 'https://cli.example.com' },
    );
    expect(config.apiUrl).toBe('https://cli.example.com');
  });

  it('prefers MARVIN_API_URL over the stored apiUrl', () => {
    const config = loadConfig(env, { ...base, apiUrl: 'https://cli.example.com' });
    expect(config.apiUrl).toBe('https://env.example.com');
  });

  it('reads a CLI-shaped credentials file end to end', () => {
    const dir = mkdtempSync(join(tmpdir(), 'marvin-creds-'));
    try {
      const path = join(dir, 'credentials.json');
      writeFileSync(
        path,
        JSON.stringify({
          apiUrl: 'https://cli.example.com',
          userToken: 'fake-top-user',
          activeWorkspace: 'demo',
          workspaces: { demo: { siteToken: 'fake-site' } },
        }),
      );
      const config = loadConfig({}, loadCredentials(path));
      expect(config).toMatchObject({
        apiUrl: 'https://cli.example.com',
        userToken: 'fake-top-user',
        siteClientToken: 'fake-site',
        workspaceSlug: 'demo',
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
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
