import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MarvinObjectNotFoundError } from '../../errors/types.js';
import { jsonResource, resourceError, toolError, toolSuccess } from '../../mcp-result.js';
import { serializeCollection, serializeCollectionSummary } from '../../serializers/collection.js';
import { serializeEntrySummary } from '../../serializers/entry.js';
import type { Capability } from '../types.js';

const slugSchema = z.object({ slug: z.string().min(1) });

export const collectionsCapability: Capability = {
  id: 'collections',
  title: 'Collections',
  summary: 'Review published Marvin collections and their entries.',
  register({ server, client, logger }) {
    server.registerTool(
      'marvin_list_collections',
      {
        title: 'List Marvin collections',
        description: 'List collections available in the configured Marvin workspace.',
      },
      async () => {
        try {
          const collections = await client.getCollections();
          const data = {
            collections: collections.map(serializeCollectionSummary),
            count: collections.length,
          };
          return toolSuccess(`Found ${collections.length} collections.`, data);
        } catch (error) {
          logger.warn('marvin_list_collections failed', error);
          return toolError(error, 'Listing Marvin collections');
        }
      },
    );

    server.registerTool(
      'marvin_get_collection',
      {
        title: 'Get Marvin collection',
        description: 'Get one Marvin collection by slug.',
        inputSchema: slugSchema,
      },
      async ({ slug }) => {
        try {
          const collectionResult = await client.getCollection(slug);
          if (collectionResult === null) throw new MarvinObjectNotFoundError('collection', slug);
          const collection = serializeCollection(collectionResult);
          return toolSuccess(`Collection ${slug} loaded.`, { collection });
        } catch (error) {
          logger.warn('marvin_get_collection failed', { slug, error });
          return toolError(error, 'Getting Marvin collection');
        }
      },
    );

    server.registerTool(
      'marvin_get_collection_entries',
      {
        title: 'Get Marvin collection entries',
        description: 'List entries belonging to a Marvin collection by collection slug.',
        inputSchema: slugSchema,
      },
      async ({ slug }) => {
        try {
          const entries = await client.getCollectionEntries(slug);
          const data = { entries: entries.map(serializeEntrySummary), count: entries.length };
          return toolSuccess(`Found ${entries.length} entries in ${slug}.`, data);
        } catch (error) {
          logger.warn('marvin_get_collection_entries failed', { slug, error });
          return toolError(error, 'Getting Marvin collection entries');
        }
      },
    );

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
