import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MarvinObjectNotFoundError } from '../../errors/types.js';
import { jsonResource, resourceError } from '../../mcp-result.js';
import { serializeCollection, serializeCollectionSummary } from '../../serializers/collection.js';
import type { Capability } from '../types.js';

/**
 * Collections — read-only RESOURCES + review prompt. All collection TOOLS
 * (list_collections / get_collection / get_collection_entries) live in the core tool registry
 * (projected by `toolsCapability`); the registry is the single source of truth.
 */
export const collectionsCapability: Capability = {
  id: 'collections',
  title: 'Collections',
  summary: 'Read published Marvin collections (resources) and guide review (prompt).',
  register({ server, client, logger }) {
    server.registerResource(
      'workspace-collections',
      'marvin://collections',
      {
        title: 'Marvin Collections',
        description: 'Collection summaries for the configured Marvin workspace.',
        mimeType: 'application/json',
      },
      async (uri) => {
        try {
          const collections = await client.getCollections();
          return jsonResource(uri.href, {
            collections: collections.map(serializeCollectionSummary),
            count: collections.length,
          });
        } catch (error) {
          logger.warn('collections resource failed', error);
          return resourceError(uri.href, error, 'Reading Marvin collections resource');
        }
      },
    );

    server.registerResource(
      'collection',
      new ResourceTemplate('marvin://collections/{slug}', { list: undefined }),
      {
        title: 'Marvin Collection',
        description: 'A Marvin collection by slug.',
        mimeType: 'application/json',
      },
      async (uri, variables) => {
        const slug = String(variables.slug);
        try {
          const collection = await client.getCollection(slug);
          if (collection === null) throw new MarvinObjectNotFoundError('collection', slug);
          return jsonResource(uri.href, {
            collection: serializeCollection(collection),
          });
        } catch (error) {
          logger.warn('collection resource failed', { slug, error });
          return resourceError(uri.href, error, 'Reading Marvin collection resource');
        }
      },
    );

    server.registerPrompt(
      'review_collections',
      {
        title: 'Review Collections',
        description: 'Review Marvin collection organization and entry grouping.',
      },
      async () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Review Marvin collections.',
                'Inspect collection names, descriptions, ordering, and entry membership.',
                'Identify duplicated grouping concepts, vague names, empty collections, and missing relationships.',
                'Recommend changes before any mutation.',
              ].join('\n'),
            },
          },
        ],
      }),
    );
  },
};
