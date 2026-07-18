import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PlatformClient, AIOperationInfo } from '@inneropen/marvin-sdk/platform';
import type { MarvinClientLike } from '../client.js';
import type { MarvinMcpConfig } from '../config.js';
import type { Logger } from '../logger.js';

export interface CapabilityContext {
  server: McpServer;
  client: MarvinClientLike;
  /** Authenticated platform client — present only when a user token is configured. */
  platform?: PlatformClient;
  /** Operation registry, pre-fetched at startup so capabilities can register synchronously. */
  operations?: AIOperationInfo[];
  config: Pick<MarvinMcpConfig, 'readOnly'>;
  logger: Logger;
}

export interface Capability {
  id: string;
  title: string;
  summary: string;
  register(context: CapabilityContext): void;
}
