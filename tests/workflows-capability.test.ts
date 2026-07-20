import { describe, expect, it, vi } from 'vitest';
import type { Automation } from '@inneropen/marvin-sdk/platform';
import { createServer } from '../src/server.js';
import { createFakeClient, silentLogger, testConfig } from './fakes.js';

/**
 * workflowsCapability projects each MCP-exposed workflow (pre-fetched, already filtered to
 * enabled + `trigger.type === "mcp"`) as a `marvin_wf_<slug>` MCP tool that routes through
 * `platform.automations.run(id)`. Enabled only with a platform token.
 */

const fakeWorkflows: Automation[] = [
  {
    id: 'wf-1',
    groupId: 'g1',
    name: 'Publish digest',
    slug: 'publish-digest',
    enabled: true,
    definition: { trigger: { type: 'mcp' } },
    createdBy: null,
  },
  {
    id: 'wf-2',
    groupId: 'g1',
    name: 'Sync feeds',
    slug: 'sync-feeds',
    enabled: true,
    definition: { trigger: { type: 'mcp' } },
    createdBy: null,
  },
];

function fakePlatform(run = vi.fn(async () => ({ ok: true, status: 'ok', result: {} }))) {
  return { automations: { run } } as any;
}

describe('workflowsCapability projection', () => {
  it('projects each workflow as marvin_wf_<slug> when a platform token is present', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      platform: fakePlatform(),
      workflows: fakeWorkflows,
      logger: silentLogger,
    });

    const registered = Object.keys((server as any)._registeredTools ?? {});
    expect(registered).toContain('marvin_wf_publish_digest');
    expect(registered).toContain('marvin_wf_sync_feeds');
  });

  it('does not project workflows without a platform token', () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      workflows: fakeWorkflows,
      logger: silentLogger,
    });

    const registered = Object.keys((server as any)._registeredTools ?? {});
    expect(registered).not.toContain('marvin_wf_publish_digest');
  });

  it('routes invocation to platform.automations.run with the workflow id', async () => {
    const run = vi.fn(async () => ({ ok: true, status: 'ok', result: { ran: true } }));
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      platform: fakePlatform(run),
      workflows: fakeWorkflows,
      logger: silentLogger,
    });

    const tool = (server as any)._registeredTools.marvin_wf_publish_digest;
    const result = await tool.handler({}, {});

    expect(run).toHaveBeenCalledWith('wf-1');
    expect(result.structuredContent).toHaveProperty('result', { ran: true });
  });

  it('surfaces a structured error when the run call fails', async () => {
    const run = vi.fn(async () => {
      throw Object.assign(new Error('boom'), { status: 500 });
    });
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      platform: fakePlatform(run),
      workflows: fakeWorkflows,
      logger: silentLogger,
    });

    const tool = (server as any)._registeredTools.marvin_wf_sync_feeds;
    const result = await tool.handler({}, {});

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error).toHaveProperty('code');
  });
});
