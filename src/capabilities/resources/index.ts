import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { jsonResource, resourceError } from '../../mcp-result.js';
import { serializeResource, serializeResourceSummary } from '../../serializers/resource.js';
import type { Capability } from '../types.js';

/**
 * Resources — read-only RESOURCES + review prompt. All resource TOOLS (list_resources /
 * get_resource) live in the core tool registry (projected by `toolsCapability`); the registry is
 * the single source of truth.
 */
export const resourcesCapability: Capability = {
  id: 'resources',
  title: 'Resources',
  summary: 'Read reusable Marvin resources (resources) and guide review (prompt).',
  register({ server, client, logger }) {
    server.registerResource(
      'workspace-resources',
      'marvin://resources',
      {
        title: 'Marvin Resources',
        description: 'Reusable resource summaries for the configured Marvin workspace.',
        mimeType: 'application/json',
      },
      async (uri) => {
        try {
          const resources = await client.getResources({ limit: 100 });
          return jsonResource(uri.href, {
            resources: resources.map(serializeResourceSummary),
            count: resources.length,
          });
        } catch (error) {
          logger.warn('workspace resources resource failed', error);
          return resourceError(uri.href, error, 'Reading Marvin resources resource');
        }
      },
    );

    server.registerResource(
      'resource',
      new ResourceTemplate('marvin://resources/{slug}', { list: undefined }),
      {
        title: 'Marvin Resource',
        description: 'A reusable Marvin resource by slug.',
        mimeType: 'application/json',
      },
      async (uri, variables) => {
        const slug = String(variables.slug);
        try {
          return jsonResource(uri.href, {
            resource: serializeResource(await client.getResource(slug)),
          });
        } catch (error) {
          logger.warn('resource resource failed', { slug, error });
          return resourceError(uri.href, error, 'Reading Marvin resource');
        }
      },
    );

    server.registerPrompt(
      'review_resources',
      {
        title: 'Review Resources',
        description: 'Review reusable Marvin resources and references.',
      },
      async () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Review Marvin reusable resources.',
                'Inspect resource types, names, descriptions, external IDs, URLs, and metadata.',
                'Identify duplicate references, missing descriptions, stale links, and unclear resource types.',
                'Recommend cleanup before any mutation.',
              ].join('\n'),
            },
          },
        ],
      }),
    );
  },
};
