import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MarvinObjectNotFoundError } from '../../errors/types.js';
import { jsonResource, resourceError } from '../../mcp-result.js';
import { serializeResource, serializeResourceSummary } from '../../serializers/resource.js';
import type { Capability } from '../types.js';

/**
 * Resources — read-only RESOURCES + review prompt. All resource TOOLS (list_resources /
 * get_resource) live in the core tool registry (projected by `toolsCapability`); the registry is
 * the single source of truth.
 *
 * The site-facing publishing API no longer serves resources, so this capability reads them through
 * the authenticated platform client and is registered only when a user token is configured.
 */
const RESOURCE_LIST_LIMIT = 100;

export const resourcesCapability: Capability = {
  id: 'resources',
  title: 'Resources',
  summary: 'Read reusable Marvin resources (resources) and guide review (prompt).',
  register({ server, platform, logger }) {
    if (!platform) {
      logger.info('resources: no user token configured — resources capability disabled.');
      return;
    }

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
          const resources = (await platform.resources.list()).slice(0, RESOURCE_LIST_LIMIT);
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
          // The platform API addresses resources by id; the URI is slug-based, so resolve via list.
          const resource = (await platform.resources.list()).find((r) => r.slug === slug);
          if (!resource) throw new MarvinObjectNotFoundError('Resource', slug);
          return jsonResource(uri.href, { resource: serializeResource(resource) });
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
