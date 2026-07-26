import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MarvinObjectNotFoundError } from '../../errors/types.js';
import { resourceError, jsonResource } from '../../mcp-result.js';
import { serializeEntry } from '../../serializers/entry.js';
import type { Capability } from '../types.js';

/**
 * Entries — read-only entry RESOURCE + authoring prompts. The `marvin_list_entries` /
 * `marvin_get_entry` TOOLS moved to the core tool registry (projected by `toolsCapability` as
 * `marvin_find_entries` / `marvin_get_entry`); the registry is the single source of truth.
 */
export const entriesCapability: Capability = {
  id: 'entries',
  title: 'Entries',
  summary: 'Read published Marvin entries (resource) and guide authoring (prompts).',
  register({ server, client, logger }) {
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
