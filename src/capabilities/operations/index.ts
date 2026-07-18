import { z } from 'zod';
import { toolError, toolSuccess } from '../../mcp-result.js';
import type { Capability } from '../types.js';

/**
 * Authoring capability — projects Marvin's AI **operations registry** as MCP tools and adds the
 * `compose` verb. Enabled only when a user token is configured (a `platform` client).
 *
 * Scope is deliberately AUTHORING-ONLY. Every call is sent with `source: "mcp"`, so the backend
 * gates it by the token's role (min_role) and the workspace's invocation_sources policy. On top
 * of that, this capability never exposes admin / destructive / go-live surfaces:
 *   - admin (users, workspaces, settings, billing) is simply not a tool here;
 *   - compose creates an `inbox` DRAFT (needs human approval — it does not publish);
 *   - operation slugs matching destructive/publish/admin patterns are skipped defensively;
 *   - an operation that opts out of the `mcp` source is not projected.
 */
const MCP_SOURCE = 'mcp';

const EXCLUDED_SLUG_PATTERNS: RegExp[] = [/delete/i, /destroy/i, /remove/i, /publish/i, /admin/i];

function toolNameFor(slug: string): string {
  return `marvin_op_${slug.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

export const operationsCapability: Capability = {
  id: 'operations',
  title: 'AI Operations',
  summary: 'Run Marvin content AI operations and compose draft entries (authoring only).',

  register({ server, platform, operations, logger }) {
    if (!platform) {
      logger.info('operations: no user token configured — authoring tools disabled (read-only mode).');
      return;
    }

    // compose — create a DRAFT entry from a brief (+ optional image assets). Never publishes.
    server.registerTool(
      'marvin_compose_entry',
      {
        title: 'Compose Draft Entry',
        description:
          'Create a DRAFT entry of `entryType` from a short brief (and optional image asset ids). ' +
          'The draft lands as "inbox" for human review — it does NOT publish. Returns the new entry.',
        inputSchema: {
          entryType: z.string().describe('entry type slug or id'),
          brief: z.string().describe('what the entry should be about'),
          assetIds: z.array(z.string()).optional().describe('image asset ids to attach / use as vision input'),
          modelOverride: z.string().optional(),
        },
      },
      async ({ entryType, brief, assetIds, modelOverride }) => {
        try {
          const res = await platform.ai.operations.composeEntry({
            entryType,
            brief,
            assetIds,
            modelOverride,
            source: MCP_SOURCE,
          });
          return toolSuccess(`Composed draft "${res.title}" (${res.status}).`, res);
        } catch (error) {
          logger.warn('marvin_compose_entry failed', error);
          return toolError(error, 'Composing entry');
        }
      },
    );

    // Auto-project the operation registry (content ops) as one tool each.
    let projected = 0;
    for (const op of operations ?? []) {
      if (EXCLUDED_SLUG_PATTERNS.some((re) => re.test(op.slug))) continue;
      const sources = (op as { invocation_sources?: string[] }).invocation_sources;
      if (Array.isArray(sources) && !sources.includes(MCP_SOURCE)) continue; // opted out of mcp

      server.registerTool(
        toolNameFor(op.slug),
        {
          title: op.name,
          description:
            `${op.description}\n\nEntity types: ${(op.entity_types || []).join(', ') || 'none'}.\n` +
            `Input schema: ${JSON.stringify(op.input_schema ?? {})}`,
          inputSchema: {
            entityType: z.string().optional().describe('entity type, e.g. "entry"'),
            entityId: z.string().optional().describe('id of the entity to operate on'),
            input: z.record(z.unknown()).optional().describe("operation input matching the op's input schema"),
          },
        },
        async ({ entityType, entityId, input }) => {
          try {
            const res = await platform.ai.operations.execute(op.slug, {
              entityType,
              entityId,
              input,
              source: MCP_SOURCE,
            });
            return toolSuccess(`Operation "${op.slug}" ${res.status}.`, res);
          } catch (error) {
            logger.warn(`operation ${op.slug} failed`, error);
            return toolError(error, `Running operation ${op.slug}`);
          }
        },
      );
      projected += 1;
    }
    logger.info(`operations: projected ${projected} operation(s) + compose from the registry.`);
  },
};
