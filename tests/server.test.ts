import { describe, expect, it, vi } from 'vitest';
import { createServer } from '../src/server.js';
import { createFakeClient, silentLogger, testConfig } from './fakes.js';

function registered(
  server: unknown,
  key: '_registeredTools' | '_registeredPrompts' | '_registeredResources' | '_registeredResourceTemplates',
) {
  return Object.keys((server as Record<string, Record<string, unknown>>)[key] ?? {});
}

function getHandler(server: unknown, kind: string, name: string) {
  const reg = (server as any)[kind];
  return reg[name]?.handler ?? reg[name]?.callback;
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

  it('registers all expected tools', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });

    const tools = registered(server, '_registeredTools');
    const expectedTools = [
      'marvin_describe_capabilities',
      'marvin_get_workspace',
      'marvin_list_entries',
      'marvin_get_entry',
      'marvin_list_collections',
      'marvin_get_collection',
      'marvin_get_collection_entries',
      'marvin_list_assets',
      'marvin_list_resources',
      'marvin_get_resource',
    ];
    for (const tool of expectedTools) {
      expect(tools, `missing tool: ${tool}`).toContain(tool);
    }
  });

  it('registers all expected prompts', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });

    const prompts = registered(server, '_registeredPrompts');
    const expectedPrompts = [
      'review_workspace_structure',
      'create_site_page',
      'prepare_release_update',
      'audit_content_model',
      'review_collections',
      'review_assets',
      'review_resources',
    ];
    for (const prompt of expectedPrompts) {
      expect(prompts, `missing prompt: ${prompt}`).toContain(prompt);
    }
  });

  it('registers static resources', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });

    const resources = registered(server, '_registeredResources');
    expect(resources).toContain('marvin://capabilities');
    expect(resources).toContain('marvin://workspace');
    expect(resources).toContain('marvin://workspace/site');
    expect(resources).toContain('marvin://collections');
    expect(resources).toContain('marvin://entry-types');
    expect(resources).toContain('marvin://resources');
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

describe('workspace tool handler', () => {
  it('returns workspace and site data', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const tool = (server as any)._registeredTools.marvin_get_workspace;
    const result = await tool.handler({}, {});

    expect(result.structuredContent.workspace).toHaveProperty('slug', 'demo');
    expect(result.structuredContent.site).toHaveProperty('id', 'site-1');
    expect(result.content[0].text).toContain('Demo Workspace');
  });

  it('returns error when SDK fails', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getWorkspaceInfo').mockRejectedValue(
      Object.assign(new Error('unauthorized'), { status: 401 }),
    );
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const tool = (server as any)._registeredTools.marvin_get_workspace;
    const result = await tool.handler({}, {});

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe('authentication_failed');
  });
});

describe('collections tool handlers', () => {
  it('marvin_list_collections returns collection summaries', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const tool = (server as any)._registeredTools.marvin_list_collections;
    const result = await tool.handler({}, {});

    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.collections[0]).toHaveProperty('slug', 'pages');
  });

  it('marvin_get_collection returns full collection', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const tool = (server as any)._registeredTools.marvin_get_collection;
    const result = await tool.handler({ slug: 'pages' }, {});

    expect(result.structuredContent.collection).toHaveProperty('slug', 'pages');
  });

  it('marvin_get_collection returns error for null result', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getCollection').mockResolvedValue(null);
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const tool = (server as any)._registeredTools.marvin_get_collection;
    const result = await tool.handler({ slug: 'missing' }, {});

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe('not_found');
  });

  it('marvin_get_collection_entries returns entries', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const tool = (server as any)._registeredTools.marvin_get_collection_entries;
    const result = await tool.handler({ slug: 'pages' }, {});

    expect(result.structuredContent.count).toBe(0);
    expect(result.structuredContent.entries).toEqual([]);
  });

  it('returns error when getCollections throws', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getCollections').mockRejectedValue(
      Object.assign(new Error('server error'), { status: 500 }),
    );
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const tool = (server as any)._registeredTools.marvin_list_collections;
    const result = await tool.handler({}, {});

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe('marvin_unavailable');
  });
});

describe('assets tool handler', () => {
  it('marvin_list_assets returns serialized assets', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const tool = (server as any)._registeredTools.marvin_list_assets;
    const result = await tool.handler({}, {});

    expect(result.structuredContent.count).toBe(1);
    const asset = result.structuredContent.assets[0];
    expect(asset).toHaveProperty('slug', 'hero');
    expect(asset).not.toHaveProperty('storageKey');
    expect(asset).not.toHaveProperty('checksum');
  });

  it('passes filter args to client', async () => {
    const client = createFakeClient();
    const spy = vi.spyOn(client, 'getAssets');
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const tool = (server as any)._registeredTools.marvin_list_assets;
    await tool.handler({ type: 'image', limit: 10 }, {});

    expect(spy).toHaveBeenCalledWith({ type: 'image', limit: 10 });
  });

  it('returns error on failure', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getAssets').mockRejectedValue(new Error('timeout'));
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const tool = (server as any)._registeredTools.marvin_list_assets;
    const result = await tool.handler({}, {});

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe('timeout');
  });
});

describe('resources tool handlers', () => {
  it('marvin_list_resources returns resource summaries', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const tool = (server as any)._registeredTools.marvin_list_resources;
    const result = await tool.handler({}, {});

    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.resources[0]).toHaveProperty('slug', 'fabric');
  });

  it('marvin_get_resource returns full resource with metadata', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const tool = (server as any)._registeredTools.marvin_get_resource;
    const result = await tool.handler({ slug: 'fabric' }, {});

    expect(result.structuredContent.resource).toHaveProperty('slug', 'fabric');
    expect(result.structuredContent.resource).toHaveProperty('metadata', { weight: '10oz' });
  });

  it('returns error on getResource failure', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getResource').mockRejectedValue(
      Object.assign(new Error('not found'), { status: 404 }),
    );
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const tool = (server as any)._registeredTools.marvin_get_resource;
    const result = await tool.handler({ slug: 'missing' }, {});

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe('not_found');
  });
});

describe('resource handlers (MCP resources)', () => {
  function makeUri(href: string) {
    return { href };
  }

  it('marvin://workspace returns workspace info', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const resource = (server as any)._registeredResources['marvin://workspace'];
    const result = await resource.readCallback(makeUri('marvin://workspace'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.workspace).toHaveProperty('slug', 'demo');
  });

  it('marvin://workspace/site returns site data', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const resource = (server as any)._registeredResources['marvin://workspace/site'];
    const result = await resource.readCallback(makeUri('marvin://workspace/site'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.site).toHaveProperty('id', 'site-1');
  });

  it('marvin://collections returns collection list', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const resource = (server as any)._registeredResources['marvin://collections'];
    const result = await resource.readCallback(makeUri('marvin://collections'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.count).toBe(1);
    expect(parsed.collections[0]).toHaveProperty('slug', 'pages');
  });

  it('marvin://entry-types infers types from entries', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const resource = (server as any)._registeredResources['marvin://entry-types'];
    const result = await resource.readCallback(makeUri('marvin://entry-types'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.entryTypes).toHaveLength(1);
    expect(parsed.entryTypes[0]).toHaveProperty('slug', 'page');
    expect(parsed.limitation).toBeTruthy();
  });

  it('marvin://resources returns resource list', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const resource = (server as any)._registeredResources['marvin://resources'];
    const result = await resource.readCallback(makeUri('marvin://resources'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.count).toBe(1);
    expect(parsed.resources[0]).toHaveProperty('slug', 'fabric');
  });

  it('marvin://capabilities returns capability data', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const resource = (server as any)._registeredResources['marvin://capabilities'];
    const result = await resource.readCallback(makeUri('marvin://capabilities'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.capabilities).toBeDefined();
    expect(parsed.sdkCapabilityInventory).toBeDefined();
    expect(parsed.futureArchitecture).toBeDefined();
  });

  it('workspace resource returns error on failure', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getWorkspaceInfo').mockRejectedValue(new Error('fail'));
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const resource = (server as any)._registeredResources['marvin://workspace'];
    const result = await resource.readCallback(makeUri('marvin://workspace'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.error).toHaveProperty('code');
  });

  it('collections resource returns error on failure', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getCollections').mockRejectedValue(new Error('fail'));
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const resource = (server as any)._registeredResources['marvin://collections'];
    const result = await resource.readCallback(makeUri('marvin://collections'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.error).toHaveProperty('code');
  });

  it('entry-types resource returns error on failure', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getEntries').mockRejectedValue(new Error('fail'));
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const resource = (server as any)._registeredResources['marvin://entry-types'];
    const result = await resource.readCallback(makeUri('marvin://entry-types'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.error).toHaveProperty('code');
  });

  it('resources resource returns error on failure', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getResources').mockRejectedValue(new Error('fail'));
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const resource = (server as any)._registeredResources['marvin://resources'];
    const result = await resource.readCallback(makeUri('marvin://resources'));
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.error).toHaveProperty('code');
  });
});

describe('resource template handlers', () => {
  function makeUri(href: string) {
    return { href };
  }

  it('marvin://entries/{slug} returns entry data', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const template = (server as any)._registeredResourceTemplates.entry;
    const result = await template.readCallback(makeUri('marvin://entries/about'), { slug: 'about' });
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.entry).toHaveProperty('slug', 'about');
  });

  it('marvin://entries/{slug} returns error for null entry', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getEntry').mockResolvedValue(null);
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const template = (server as any)._registeredResourceTemplates.entry;
    const result = await template.readCallback(makeUri('marvin://entries/missing'), { slug: 'missing' });
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.error).toHaveProperty('code', 'not_found');
  });

  it('marvin://collections/{slug} returns collection data', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const template = (server as any)._registeredResourceTemplates.collection;
    const result = await template.readCallback(makeUri('marvin://collections/pages'), { slug: 'pages' });
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.collection).toHaveProperty('slug', 'pages');
  });

  it('marvin://collections/{slug} returns error for null collection', async () => {
    const client = createFakeClient();
    vi.spyOn(client, 'getCollection').mockResolvedValue(null);
    const server = createServer({ config: testConfig, client, logger: silentLogger });
    const template = (server as any)._registeredResourceTemplates.collection;
    const result = await template.readCallback(makeUri('marvin://collections/missing'), { slug: 'missing' });
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.error).toHaveProperty('code', 'not_found');
  });

  it('marvin://resources/{slug} returns resource data', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const template = (server as any)._registeredResourceTemplates.resource;
    const result = await template.readCallback(makeUri('marvin://resources/fabric'), { slug: 'fabric' });
    const parsed = JSON.parse(result.contents[0].text);

    expect(parsed.resource).toHaveProperty('slug', 'fabric');
    expect(parsed.resource).toHaveProperty('metadata', { weight: '10oz' });
  });
});

describe('prompt handlers', () => {
  it('review_workspace_structure returns prompt messages', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const prompt = (server as any)._registeredPrompts.review_workspace_structure;
    const result = await prompt.callback({});

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.text).toContain('Review the Marvin workspace');
  });

  it('create_site_page returns prompt messages', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const prompt = (server as any)._registeredPrompts.create_site_page;
    const result = await prompt.callback({});

    expect(result.messages[0].content.text).toContain('create a Marvin site page');
  });

  it('prepare_release_update returns prompt messages', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const prompt = (server as any)._registeredPrompts.prepare_release_update;
    const result = await prompt.callback({});

    expect(result.messages[0].content.text).toContain('release update');
  });

  it('audit_content_model returns prompt messages', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const prompt = (server as any)._registeredPrompts.audit_content_model;
    const result = await prompt.callback({});

    expect(result.messages[0].content.text).toContain('Audit the Marvin content model');
  });

  it('review_collections returns prompt messages', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const prompt = (server as any)._registeredPrompts.review_collections;
    const result = await prompt.callback({});

    expect(result.messages[0].content.text).toContain('Review Marvin collections');
  });

  it('review_assets returns prompt messages', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const prompt = (server as any)._registeredPrompts.review_assets;
    const result = await prompt.callback({});

    expect(result.messages[0].content.text).toContain('Review Marvin assets');
  });

  it('review_resources returns prompt messages', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });
    const prompt = (server as any)._registeredPrompts.review_resources;
    const result = await prompt.callback({});

    expect(result.messages[0].content.text).toContain('Review Marvin reusable resources');
  });
});
