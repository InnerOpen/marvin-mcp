import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MarvinObjectNotFoundError } from '../../errors/types.js';
import { resourceError, jsonResource, toolError, toolSuccess } from '../../mcp-result.js';
import { serializeEntry, serializeEntrySummary } from '../../serializers/entry.js';
import type { Capability } from '../types.js';

const listEntriesSchema = z.object({
  entryType: z.string().optional(),
  collection: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

const slugSchema = z.object({ slug: z.string().min(1) });

export const entriesCapability: Capability = {
  id: 'entries',
  title: 'Entries',
  summary: 'List, find, and inspect published Marvin entries.',
  register({ server, client, logger }) {
    server.registerTool(
      'marvin_list_entries',
      {
        title: 'List Marvin entries',
        description:
          'List published Marvin entries with SDK-supported entryType, collection, limit, and offset filters.',
        inputSchema: listEntriesSchema,
      },
      async (args) => {
        try {
          const entries = await client.getEntries(args);
          const data = { entries: entries.map(serializeEntrySummary), count: entries.length };
          return toolSuccess(`Found ${entries.length} entries.`, data);
        } catch (error) {
          logger.warn('marvin_list_entries failed', error);
          return toolError(error, 'Listing Marvin entries');
        }
      },
    );

    server.registerTool(
      'marvin_get_entry',
      {
        title: 'Find Marvin entry',
        description: 'Find one Marvin entry by slug using the Marvin SDK publishing client.',
        inputSchema: slugSchema,
      },
      async ({ slug }) => {
        try {
          const entryResult = await client.getEntry(slug);
          if (entryResult === null) throw new MarvinObjectNotFoundError('entry', slug);
          const entry = serializeEntry(entryResult);
          return toolSuccess(`Entry ${slug} loaded.`, { entry });
        } catch (error) {
          logger.warn('marvin_get_entry failed', { slug, error });
          return toolError(error, 'Getting Marvin entry');
        }
      },
    );

    server.registerResource(
      'entry',
      new ResourceTemplate('marvin://entries/{slug}', { list: undefined }),
      {
        title: 'Marvin Entry',
        description: 'A Marvin entry by slug.',
        mimeType: 'application/json',
      },
      async (uri, variables) => {
        const slug = String(variables.slug);
        try {
          const entry = await client.getEntry(slug);
          if (entry === null) throw new MarvinObjectNotFoundError('entry', slug);
          return jsonResource(uri.href, { entry: serializeEntry(entry) });
        } catch (error) {
          logger.warn('entry resource failed', { slug, error });
          return resourceError(uri.href, error, 'Reading Marvin entry resource');
        }
      },
    );

    server.registerPrompt(
      'create_site_page',
      {
        title: 'Create Site Page',
        description: 'Guide creation of a Marvin page draft without automatic publishing.',
      },
      async () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Help create a Marvin site page.',
                'Inspect available page-like entries and the inferred Page entry type before drafting.',
                'Gather title, slug, summary, body fields, and appropriate collections from the user.',
                'If write tools are unavailable, produce a draft payload and explain the SDK capability gap.',
                'Never publish automatically.',
              ].join('\n'),
            },
          },
        ],
      }),
    );

    server.registerPrompt(
      'prepare_release_update',
      {
        title: 'Prepare Release Update',
        description: 'Draft a release/update entry for Marvin content workflows.',
      },
      async () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Prepare a release update.',
                'Inspect existing release or update content first.',
                'Draft content including project, version, significance, maturity, and relevant links.',
                'Create only a draft when write tools are available; do not publish without explicit user intent.',
              ].join('\n'),
            },
          },
        ],
      }),
    );
  },
};
