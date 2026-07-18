#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMarvinPlatformClient, createMarvinSdkClient } from './client.js';
import { loadConfig } from './config.js';
import { normalizeError } from './errors/normalize-error.js';
import { createLogger } from './logger.js';
import { createServer } from './server.js';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);
  const client = createMarvinSdkClient(config);
  const platform = createMarvinPlatformClient(config);

  // Pre-fetch the operation registry so capabilities register synchronously. Best-effort:
  // if the backend is unreachable, compose still registers and reads keep working.
  let operations;
  if (platform) {
    logger.info('Platform client enabled — authoring capabilities active.');
    try {
      operations = await platform.ai.operations.list();
    } catch (error) {
      logger.warn('Could not pre-fetch the operation registry (compose still available)', error);
    }
  }

  const server = createServer({ config, client, platform, operations, logger });
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
