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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MarvinMcpConfig {
  const result = configSchema.safeParse({
    apiUrl: env.MARVIN_API_URL,
    siteClientToken: env.MARVIN_SITE_CLIENT_TOKEN,
    workspaceSlug: env.MARVIN_WORKSPACE_SLUG,
    logLevel: env.MARVIN_MCP_LOG_LEVEL ?? 'warn',
    readOnly: env.MARVIN_MCP_READ_ONLY,
  });

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join('; ');
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
