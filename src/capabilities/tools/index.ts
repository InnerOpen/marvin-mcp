import { z } from 'zod';
import { toolError, toolSuccess } from '../../mcp-result.js';
import type { Capability } from '../types.js';

/**
 * Core tools capability — projects Marvin's **core tool registry** (read/query/action tools)
 * as MCP tools, modeled exactly on `operationsCapability`. Enabled only when a user token is
 * configured (a `platform` client): every call is sent with `source: "mcp"`, so the backend
 * gates it by the token's role (min_role) and the workspace's invocation_sources policy.
 *
 * These tools are the single source of truth in core. Add a tool to the registry there and it
 * appears here automatically — no TypeScript change — the same way AI operations already project.
 */
const MCP_SOURCE = 'mcp';

function toolNameFor(name: string): string {
  return `marvin_${name.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

export const toolsCapability: Capability = {
  id: 'tools',
  title: 'Core Tools',
  summary: 'Marvin core read/query tools (search, browse, list) projected from the registry.',

  register({ server, platform, tools, logger }) {
    if (!platform) {
      logger.info('tools: no user token configured — core tools disabled (read-only mode).');
      return;
    }

    let projected = 0;
    for (const tool of tools ?? []) {
      server.registerTool(
        toolNameFor(tool.name),
        {
          title: tool.name,
          description: `${tool.description}\n\nInput schema: ${JSON.stringify(tool.input_schema ?? {})}`,
          inputSchema: {
            args: z
              .record(z.unknown())
              .optional()
              .describe("tool args matching the tool's input schema"),
          },
        },
        async ({ args }) => {
          try {
            const res = await platform.ai.tools.invoke(tool.name, {
              args: args ?? {},
              source: MCP_SOURCE,
            });
            return toolSuccess(`Tool "${tool.name}" ran.`, res);
          } catch (error) {
            logger.warn(`tool ${tool.name} failed`, error);
            return toolError(error, `Running tool ${tool.name}`);
          }
        },
      );
      projected += 1;
    }
    logger.info(`tools: projected ${projected} core tool(s) from the registry.`);
  },
};
