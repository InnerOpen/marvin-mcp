import { jsonResource, resourceError } from '../../mcp-result.js';
import { serializeEntrySummary } from '../../serializers/entry.js';
import type { Capability } from '../types.js';

/**
 * Entry Types — token-less inferred-from-entries RESOURCE + audit prompt. The entry-type TOOLS
 * (list_entry_types / get_entry_type, incl. full schema + recipe) live in the core tool registry
 * (projected by `toolsCapability`); the registry is the single source of truth.
 */
export const entryTypesCapability: Capability = {
  id: 'entry-types',
  title: 'Entry Types',
  summary: 'Inspect entry types inferred from entries (resource) and audit the model (prompt).',
  register({ server, client, logger }) {
    server.registerResource(
      'entry-types',
      'marvin://entry-types',
      {
        title: 'Marvin Entry Types',
        description:
          'Entry type information inferred from available entries; the publishing SDK has no entry-type list method.',
        mimeType: 'application/json',
      },
      async (uri) => {
        try {
          const entries = await client.getEntries({ limit: 100 });
          const bySlug = new Map<string, unknown>();
          for (const entry of entries.map(serializeEntrySummary)) {
            const entryType = entry.entryType;
            if (entryType && typeof entryType === 'object') {
              const slug = (entryType as Record<string, unknown>).slug;
              if (typeof slug === 'string') bySlug.set(slug, entryType);
            }
          }
          return jsonResource(uri.href, {
            entryTypes: [...bySlug.values()],
            limitation:
              'The publishing Marvin SDK does not expose a dedicated entry-type list method; platform SDK entryTypes requires user-token/session auth.',
          });
        } catch (error) {
          logger.warn('entry types resource failed', error);
          return resourceError(uri.href, error, 'Reading Marvin entry types resource');
        }
      },
    );

    server.registerPrompt(
      'audit_content_model',
      {
        title: 'Audit Content Model',
        description: 'Audit entries, collections, resources, and site settings for model quality.',
      },
      async () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Audit the Marvin content model.',
                'Inspect entry types inferred from entries, collections, resources, and site settings.',
                'Find duplicated concepts, ambiguous names, missing relationships, and schema/content mismatches.',
                'Return prioritized recommendations before making any changes.',
              ].join('\n'),
            },
          },
        ],
      }),
    );
  },
};
