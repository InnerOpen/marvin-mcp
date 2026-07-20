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

  // Pre-fetch the operation + core tool registries so capabilities register synchronously.
  // Best-effort: if the backend is unreachable, compose still registers and reads keep working.
  let operations;
  let tools;
  let workflows;
  if (platform) {
    logger.info('Platform client enabled — authoring capabilities active.');
    try {
      operations = await platform.ai.operations.list();
    } catch (error) {
      logger.warn('Could not pre-fetch the operation registry (compose still available)', error);
    }
    try {
      tools = await platform.ai.tools.list();
    } catch (error) {
      logger.warn('Could not pre-fetch the core tool registry', error);
    }
    try {
      // ADMIN-gated: a non-admin / user-less token may 403 — degrade to no workflows.
      const automations = await platform.automations.list();
      workflows = automations.filter(
        (wf) => wf.enabled && wf.definition?.trigger?.type === 'mcp',
      );
    } catch (error) {
      workflows = [];
      logger.warn('Could not pre-fetch workflows (automations are admin-gated)', error);
    }
  }

  const server = createServer({ config, client, platform, operations, tools, workflows, logger });
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
