import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PlatformClient, AIOperationInfo } from '@inneropen/marvin-sdk/platform';
import type { MarvinClientLike } from './client.js';
import type { MarvinMcpConfig } from './config.js';
import type { Logger } from './logger.js';
import { registerCapabilities } from './capabilities/index.js';

export interface CreateServerOptions {
  config: MarvinMcpConfig;
  client: MarvinClientLike;
  platform?: PlatformClient;
  operations?: AIOperationInfo[];
  logger: Logger;
}

export function createServer({ config, client, platform, operations, logger }: CreateServerOptions) {
  const server = new McpServer(
    {
      name: '@inneropen/marvin-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  registerCapabilities({ server, client, platform, operations, config, logger });

  return server;
}
