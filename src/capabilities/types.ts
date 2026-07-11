import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MarvinClientLike } from '../client.js';
import type { MarvinMcpConfig } from '../config.js';
import type { Logger } from '../logger.js';

export interface CapabilityContext {
  server: McpServer;
  client: MarvinClientLike;
  config: Pick<MarvinMcpConfig, 'readOnly'>;
  logger: Logger;
}

export interface Capability {
  id: string;
  title: string;
  summary: string;
  register(context: CapabilityContext): void;
}
