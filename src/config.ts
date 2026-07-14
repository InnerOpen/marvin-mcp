import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { z } from 'zod';

const booleanString = z
  .string()
  .optional()
  .transform((value) => value?.toLowerCase() === 'true');

const configSchema = z.object({
  apiUrl: z.string().url('MARVIN_API_URL must be a valid URL'),
  siteClientToken: z.string().min(1, 'MARVIN_SITE_CLIENT_TOKEN is required'),
  workspaceSlug: z.string().min(1, 'MARVIN_WORKSPACE_SLUG is required'),
  logLevel: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('warn'),
  readOnly: booleanString.default('true'),
});

export type MarvinMcpConfig = z.infer<typeof configSchema>;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

interface MarvinCredentials {
  activeWorkspace?: string;
  workspaces?: Record<string, { siteToken?: string }>;
}

export function loadCredentials(
  credentialsPath = join(homedir(), '.marvin', 'credentials.json'),
): MarvinCredentials {
  if (!existsSync(credentialsPath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  credentials?: MarvinCredentials,
): MarvinMcpConfig {
  const creds = credentials ?? loadCredentials();

  const workspaceSlug = env.MARVIN_WORKSPACE_SLUG || creds.activeWorkspace;

  // Stored credentials beat env var — lets 'marvin login --site-token' take effect
  // even when Claude Code has an old token cached in its MCP server env config.
  // Env var is the fallback for CI/automation where no credentials file exists.
  const storedSiteToken = workspaceSlug ? creds.workspaces?.[workspaceSlug]?.siteToken : undefined;
  const siteClientToken = storedSiteToken || env.MARVIN_SITE_CLIENT_TOKEN;

  const result = configSchema.safeParse({
    apiUrl: env.MARVIN_API_URL,
    siteClientToken,
    workspaceSlug,
    logLevel: env.MARVIN_MCP_LOG_LEVEL ?? 'warn',
    readOnly: env.MARVIN_MCP_READ_ONLY,
  });

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        if (path === 'siteClientToken') {
          return `MARVIN_SITE_CLIENT_TOKEN is required. Set the env var or run 'marvin login --site-token <token> --workspace <slug>' to save credentials to ~/.marvin/credentials.json`;
        }
        if (path === 'workspaceSlug') {
          return `MARVIN_WORKSPACE_SLUG is required. Set the env var or run 'marvin login --site-token <token> --workspace <slug>' to save credentials to ~/.marvin/credentials.json`;
        }
        return issue.message;
      })
      .join('; ');
    throw new ConfigurationError(message);
  }

  return result.data;
}

export function toSdkConfig(config: MarvinMcpConfig) {
  return {
    apiUrl: config.apiUrl,
    siteClientToken: config.siteClientToken,
    workspaceSlug: config.workspaceSlug,
    autoInitialize: false,
  };
}
