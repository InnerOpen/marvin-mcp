#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMarvinSdkClient } from './client.js';
import { loadConfig } from './config.js';
import { normalizeError } from './errors/normalize-error.js';
import { createLogger } from './logger.js';
import { createServer } from './server.js';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);
  const client = createMarvinSdkClient(config);
  const server = createServer({ config, client, logger });
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((error) => {
  const normalized = normalizeError(error, 'Starting marvin-mcp');
  process.stderr.write(
    `[marvin-mcp] ${normalized.code}: ${normalized.message} ${normalized.suggestion}\n`,
  );
  process.exit(1);
});
