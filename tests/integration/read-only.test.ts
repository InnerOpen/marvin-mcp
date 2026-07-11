import { describe, expect, it } from 'vitest';
import { createMarvinSdkClient } from '../../src/client.js';
import { loadConfig } from '../../src/config.js';

const shouldRun = process.env.MARVIN_MCP_INTEGRATION_TESTS === 'true';

describe.skipIf(!shouldRun)('Marvin read-only integration', () => {
  it('loads workspace info without mutating content', async () => {
    const config = loadConfig(process.env);
    const client = createMarvinSdkClient(config);
    const workspace = await client.getWorkspaceInfo();

    expect(workspace.slug).toBe(config.workspaceSlug);
  });
});
