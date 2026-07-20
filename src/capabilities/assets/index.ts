import type { Capability } from '../types.js';

/**
 * Assets — review prompt only. The asset TOOLS (list_assets / get_asset) live in the core tool
 * registry (projected by `toolsCapability` as marvin_list_assets / marvin_get_asset); the registry
 * is the single source of truth.
 */
export const assetsCapability: Capability = {
  id: 'assets',
  title: 'Assets',
  summary: 'Guide review of Marvin asset metadata (prompt); asset tools come from the registry.',
  register({ server }) {
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
