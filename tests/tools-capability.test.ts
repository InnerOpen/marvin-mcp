import { describe, expect, it, vi } from 'vitest';
import type { AIToolInfo } from '@inneropen/marvin-sdk/platform';
import { createServer } from '../src/server.js';
import { createFakeClient, silentLogger, testConfig } from './fakes.js';

/**
 * toolsCapability projects the core tool registry (pre-fetched `tools`) as `marvin_<name>` MCP
 * tools that route through `platform.ai.tools.invoke`. Enabled only with a platform token.
 */

const fakeTools: AIToolInfo[] = [
  {
    name: 'get_entry',
    description: 'Get one entry in full by id or slug.',
    input_schema: { type: 'object', properties: { id_or_slug: { type: 'string' } } },
    min_role: 1,
    sources: ['mcp', 'agent'],
    read_only: true,
  },
  {
    name: 'find_entries',
    description: 'Find entries with filters.',
    input_schema: { type: 'object', properties: {} },
    min_role: 1,
    sources: ['mcp', 'agent'],
    read_only: true,
  },
];

/** Each test supplies an `invoke` returning its own payload shape, so keep the param wide. */
type FakeInvoke = (...args: never[]) => Promise<unknown>;

function fakePlatform(invoke: FakeInvoke = vi.fn(async () => ({ ok: true }))) {
  return { ai: { tools: { invoke } } } as any;
}

describe('toolsCapability projection', () => {
  it('projects each registry tool as marvin_<name> when a platform token is present', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      platform: fakePlatform(),
      tools: fakeTools,
      logger: silentLogger,
    });

    const registered = Object.keys((server as any)._registeredTools ?? {});
    expect(registered).toContain('marvin_get_entry');
    expect(registered).toContain('marvin_find_entries');
  });

  it('does not project registry tools without a platform token', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      tools: fakeTools,
      logger: silentLogger,
    });

    const registered = Object.keys((server as any)._registeredTools ?? {});
    // marvin_get_entry is now a registry-only projection — absent without a token.
    expect(registered).not.toContain('marvin_find_entries');
  });

  it('routes invocation to platform.ai.tools.invoke with source "mcp"', async () => {
    const invoke = vi.fn(async () => ({ id: 'e1', title: 'About' }));
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      platform: fakePlatform(invoke),
      tools: fakeTools,
      logger: silentLogger,
    });

    const tool = (server as any)._registeredTools.marvin_get_entry;
    const result = await tool.handler({ args: { id_or_slug: 'about' } }, {});

    expect(invoke).toHaveBeenCalledWith('get_entry', {
      args: { id_or_slug: 'about' },
      source: 'mcp',
    });
    expect(result.structuredContent).toHaveProperty('title', 'About');
  });

  it('surfaces a structured error when the invoke call fails', async () => {
    const invoke = vi.fn(async () => {
      throw Object.assign(new Error('boom'), { status: 500 });
    });
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      platform: fakePlatform(invoke),
      tools: fakeTools,
      logger: silentLogger,
    });

    const tool = (server as any)._registeredTools.marvin_find_entries;
    const result = await tool.handler({ args: {} }, {});

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error).toHaveProperty('code');
  });
});
