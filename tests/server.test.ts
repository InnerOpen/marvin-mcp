import { describe, expect, it, vi } from 'vitest';
import { createServer } from '../src/server.js';
import { createFakeClient, silentLogger, testConfig } from './fakes.js';

function registered(
  server: unknown,
  key: '_registeredTools' | '_registeredPrompts' | '_registeredResources',
) {
  return Object.keys((server as Record<string, Record<string, unknown>>)[key] ?? {});
}

describe('createServer', () => {
  it('registers read tools and omits mutation tools in read-only mode', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });

    const tools = registered(server, '_registeredTools');
    expect(tools).toContain('marvin_get_workspace');
    expect(tools).toContain('marvin_list_entries');
    expect(tools).not.toContain('marvin_create_entry');
    expect(tools).not.toContain('marvin_publish_entry');
  });

  it('registers reusable prompts', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });

    expect(registered(server, '_registeredPrompts')).toEqual(
      expect.arrayContaining([
        'review_workspace_structure',
        'create_site_page',
        'prepare_release_update',
        'audit_content_model',
      ]),
    );
  });

  it('invokes the SDK client from tool handlers', async () => {
    const client = createFakeClient();
    const spy = vi.spyOn(client, 'getEntries');
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const tool = (server as any)._registeredTools.marvin_list_entries;

    const result = await tool.handler({ limit: 5, entryType: 'page' }, {});

    expect(spy).toHaveBeenCalledWith({ limit: 5, entryType: 'page' });
    expect(result.structuredContent.count).toBe(1);
  });

  it('returns a structured not-found error when the prerelease SDK returns null', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getEntry').mockResolvedValue(null);
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const tool = (server as any)._registeredTools.marvin_get_entry;

    const result = await tool.handler({ slug: 'missing' }, {});

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe('not_found');
  });
});
