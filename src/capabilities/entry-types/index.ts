import { z } from 'zod';
import { jsonResource, resourceError, toolError, toolSuccess } from '../../mcp-result.js';
import { serializeEntrySummary } from '../../serializers/entry.js';
import { serializeEntryType, serializeEntryTypeSummary } from '../../serializers/entryType.js';
import type { Capability } from '../types.js';

const getEntryTypeSchema = z.object({
  id: z.string().min(1).describe('entry type id or slug'),
});

export const entryTypesCapability: Capability = {
  id: 'entry-types',
  title: 'Entry Types',
  summary: 'Inspect entry types — full schema/recipe via the platform token, or inferred from entries.',
  register({ server, client, platform, logger }) {
    // Real entry-type list/get — only with a user token. The publishing SDK cannot list types,
    // so the inferred-from-entries resource below stays as a read-only fallback.
    if (platform) {
      server.registerTool(
        'marvin_list_entry_types',
        {
          title: 'List Marvin entry types',
          description:
            'List the workspace entry types (name, slug, flags). Use marvin_get_entry_type for the ' +
            'full field schema + authoring recipe — needed before composing an entry of that type.',
        },
        async () => {
          try {
            const types = await platform.entryTypes.list();
            const data = {
              entryTypes: types.map(serializeEntryTypeSummary),
              count: types.length,
            };
            return toolSuccess(`Found ${types.length} entry types.`, data);
          } catch (error) {
            logger.warn('marvin_list_entry_types failed', error);
            return toolError(error, 'Listing Marvin entry types');
          }
        },
      );

      server.registerTool(
        'marvin_get_entry_type',
        {
          title: 'Get Marvin entry type',
          description:
            'Get one entry type by id or slug, including its field schema (schemaJson) and authoring ' +
            'recipe (recipeJson). The field schema is what compose fills.',
          inputSchema: getEntryTypeSchema,
        },
        async ({ id }) => {
          try {
            const entryType = serializeEntryType(await platform.entryTypes.get(id));
            return toolSuccess(`Entry type ${id} loaded.`, { entryType });
          } catch (error) {
            logger.warn('marvin_get_entry_type failed', { id, error });
            return toolError(error, 'Getting Marvin entry type');
          }
        },
      );
    }

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
