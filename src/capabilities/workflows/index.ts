import { z } from 'zod';
import { toolError, toolSuccess } from '../../mcp-result.js';
import type { Capability } from '../types.js';

/**
 * Workflows capability — projects each Marvin workspace **workflow (automation) that opts into
 * MCP exposure** (enabled AND `definition.trigger.type === "mcp"`) as its own named MCP tool,
 * modeled on `toolsCapability`. Enabled only when a user token is configured (a `platform`
 * client). Calling the tool runs that workflow now via `platform.automations.run(id)`.
 *
 * These workflows take no structured input — they run as authored, so each tool exposes an
 * empty/optional args record.
 */
function toolNameFor(slug: string): string {
  return `marvin_wf_${slug.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

export const workflowsCapability: Capability = {
  id: 'workflows',
  title: 'Workflows',
  summary: 'Run Marvin workspace workflows (automations) that opt into MCP exposure.',

  register({ server, platform, workflows, logger }) {
    if (!platform) {
      logger.info('workflows: no user token configured — workflow tools disabled (read-only mode).');
      return;
    }

    let projected = 0;
    for (const wf of workflows ?? []) {
      server.registerTool(
        toolNameFor(wf.slug),
        {
          title: wf.name,
          description: `Run the '${wf.name}' workflow.`,
          inputSchema: {
            args: z.record(z.unknown()).optional().describe('this workflow takes no input'),
          },
        },
        async () => {
          try {
            const res = await platform.automations.run(wf.id);
            return toolSuccess(`Workflow "${wf.name}" ran.`, res);
          } catch (error) {
            logger.warn(`workflow ${wf.slug} failed`, error);
            return toolError(error, `Running workflow ${wf.name}`);
          }
        },
      );
      projected += 1;
    }
    logger.info(`workflows: projected ${projected} workflow(s) exposed to MCP.`);
  },
};
