import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { jsonResource, resourceError, toolError, toolSuccess } from '../../mcp-result.js';
import { serializeResource, serializeResourceSummary } from '../../serializers/resource.js';
import type { Capability } from '../types.js';

const slugSchema = z.object({ slug: z.string().min(1) });

const listResourcesSchema = z.object({
  resourceType: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const resourcesCapability: Capability = {
  id: 'resources',
  title: 'Resources',
  summary: 'Review reusable Marvin structured resources.',
  register({ server, client, logger }) {
    server.registerTool(
      'marvin_list_resources',
      {
        title: 'List Marvin resources',
        description:
          'List reusable Marvin resources with SDK-supported resourceType pagination filters.',
        inputSchema: listResourcesSchema,
      },
      async (args) => {
        try {
          const resources = await client.getResources(args);
          const data = {
            resources: resources.map(serializeResourceSummary),
            count: resources.length,
          };
          return toolSuccess(`Found ${resources.length} resources.`, data);
        } catch (error) {
          logger.warn('marvin_list_resources failed', error);
          return toolError(error, 'Listing Marvin resources');
        }
      },
    );

    server.registerTool(
      'marvin_get_resource',
      {
        title: 'Get Marvin resource',
        description: 'Get one reusable Marvin resource by slug.',
        inputSchema: slugSchema,
      },
      async ({ slug }) => {
        try {
          const resource = serializeResource(await client.getResource(slug));
          return toolSuccess(`Resource ${slug} loaded.`, { resource });
        } catch (error) {
          logger.warn('marvin_get_resource failed', { slug, error });
          return toolError(error, 'Getting Marvin resource');
        }
      },
    );

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
