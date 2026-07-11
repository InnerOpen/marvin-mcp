import { z } from 'zod';
import { toolError, toolSuccess } from '../../mcp-result.js';
import { serializeAsset } from '../../serializers/asset.js';
import type { Capability } from '../types.js';

const listAssetsSchema = z.object({
  type: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const assetsCapability: Capability = {
  id: 'assets',
  title: 'Assets',
  summary: 'Review published Marvin asset metadata without returning binary payloads.',
  register({ server, client, logger }) {
    server.registerTool(
      'marvin_list_assets',
      {
        title: 'List Marvin assets',
        description: 'List Marvin asset metadata. Binary media payloads are not returned.',
        inputSchema: listAssetsSchema,
      },
      async (args) => {
        try {
          const assets = await client.getAssets(args);
          const data = { assets: assets.map(serializeAsset), count: assets.length };
          return toolSuccess(`Found ${assets.length} assets.`, data);
        } catch (error) {
          logger.warn('marvin_list_assets failed', error);
          return toolError(error, 'Listing Marvin assets');
        }
      },
    );

    server.registerPrompt(
      'review_assets',
      {
        title: 'Review Assets',
        description: 'Review Marvin asset metadata and content usage considerations.',
      },
      async () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Review Marvin assets.',
                'Inspect asset metadata, file types, alt text, descriptions, and likely content usage.',
                'Identify missing alt text, unclear names, oversized media risks, and duplicate assets.',
                'Do not request or expose binary payloads.',
              ].join('\n'),
            },
          },
        ],
      }),
    );
  },
};
