import type { Capability } from '../types.js';
import { toolError, toolSuccess, jsonResource, resourceError } from '../../mcp-result.js';
import { serializeSite, serializeWorkspaceInfo } from '../../serializers/workspace.js';

export const workspaceCapability: Capability = {
  id: 'workspace',
  title: 'Workspace',
  summary: 'Inspect configured workspace identity and public site settings.',
  register({ server, client, logger }) {
    server.registerTool(
      'marvin_get_workspace',
      {
        title: 'Get Marvin workspace',
        description:
          'Return basic information and site settings for the configured Marvin workspace.',
      },
      async () => {
        try {
          const [workspace, site] = await Promise.all([
            client.getWorkspaceInfo(),
            client.getSite(),
          ]);
          const data = { workspace: serializeWorkspaceInfo(workspace), site: serializeSite(site) };
          return toolSuccess(`Workspace ${workspace.name} (${workspace.slug}) loaded.`, data);
        } catch (error) {
          logger.warn('marvin_get_workspace failed', error);
          return toolError(error, 'Getting Marvin workspace');
        }
      },
    );

    server.registerResource(
      'workspace',
      'marvin://workspace',
      {
        title: 'Marvin Workspace',
        description: 'Basic information for the configured Marvin workspace.',
        mimeType: 'application/json',
      },
      async (uri) => {
        try {
          return jsonResource(uri.href, {
            workspace: serializeWorkspaceInfo(await client.getWorkspaceInfo()),
          });
        } catch (error) {
          logger.warn('workspace resource failed', error);
          return resourceError(uri.href, error, 'Reading Marvin workspace resource');
        }
      },
    );

    server.registerResource(
      'workspace-site',
      'marvin://workspace/site',
      {
        title: 'Marvin Workspace Site',
        description: 'Public site settings for the configured Marvin workspace.',
        mimeType: 'application/json',
      },
      async (uri) => {
        try {
          return jsonResource(uri.href, { site: serializeSite(await client.getSite()) });
        } catch (error) {
          logger.warn('workspace site resource failed', error);
          return resourceError(uri.href, error, 'Reading Marvin site resource');
        }
      },
    );

    server.registerPrompt(
      'review_workspace_structure',
      {
        title: 'Review Workspace Structure',
        description:
          'Inspect Marvin workspace structure and recommend non-destructive improvements.',
      },
      async () => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                'Review the Marvin workspace structure.',
                'Inspect the workspace, site settings, collections, entries, resources, and inferred entry types.',
                'Identify inconsistent naming, unclear relationships, missing summaries, duplicate structures, and content-model risks.',
                'Recommend changes only; do not mutate content unless the user explicitly asks afterward.',
              ].join('\n'),
            },
          },
        ],
      }),
    );
  },
};
