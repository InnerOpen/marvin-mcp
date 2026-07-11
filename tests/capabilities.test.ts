import { describe, expect, it } from 'vitest';
import { sdkCapabilityInventory } from '../src/capabilities/inventory.js';
import { createServer } from '../src/server.js';
import { createFakeClient, silentLogger, testConfig } from './fakes.js';

describe('capabilities', () => {
  it('documents the SDK capability inventory with auth and MCP mapping', () => {
    expect(sdkCapabilityInventory.length).toBeGreaterThan(5);
    expect(sdkCapabilityInventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sdkModule: 'Publishing Entries',
          auth: 'site token',
          readWrite: 'read',
        }),
        expect.objectContaining({
          sdkModule: 'Platform Entries',
          auth: 'user token/session',
          readWrite: 'read/write',
        }),
      ]),
    );
  });

  it('registers a self-describing capabilities tool and resource', async () => {
    const server = createServer({
      config: testConfig,
      client: createFakeClient(),
      logger: silentLogger,
    });

    const tool = (server as any)._registeredTools.marvin_describe_capabilities;
    const result = await tool.handler({});

    expect(result.structuredContent.capabilities).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'entries' })]),
    );
    expect(Object.keys((server as any)._registeredResources)).toContain('marvin://capabilities');
  });
});
