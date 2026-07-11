import type { Capability } from '../types.js';
import { publicCapabilitySummaries, sdkCapabilityInventory } from '../inventory.js';
import { jsonResource } from '../../mcp-result.js';
import { toolSuccess } from '../../mcp-result.js';

export const metaCapability: Capability = {
  id: 'capabilities',
  title: 'Marvin Capabilities',
  summary: 'Self-describes Marvin MCP capabilities and SDK inventory.',
  register({ server }) {
    server.registerTool(
      'marvin_describe_capabilities',
      {
        title: 'Describe Marvin capabilities',
        description:
          'Explain the Marvin capabilities exposed by this MCP server and summarize the SDK capability inventory.',
      },
      async () => {
        const data = describeCapabilities();
        return toolSuccess('Marvin capability inventory loaded.', data);
      },
    );

    server.registerResource(
      'marvin-capabilities',
      'marvin://capabilities',
      {
        title: 'Marvin Capability Inventory',
        description: 'Self-description of Marvin MCP capabilities and SDK support.',
        mimeType: 'application/json',
      },
      async (uri) => jsonResource(uri.href, describeCapabilities()),
    );
  },
};

function describeCapabilities() {
  return {
    capabilities: publicCapabilitySummaries,
    sdkCapabilityInventory,
    futureArchitecture: ['Actions', 'Skills', 'Agents', 'Workspace Memory'],
  };
}
