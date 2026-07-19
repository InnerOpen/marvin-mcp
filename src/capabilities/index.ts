import type { Capability, CapabilityContext } from './types.js';
import { assetsCapability } from './assets/index.js';
import { collectionsCapability } from './collections/index.js';
import { entriesCapability } from './entries/index.js';
import { entryTypesCapability } from './entry-types/index.js';
import { formsCapability } from './forms/index.js';
import { insightsCapability } from './insights/index.js';
import { metaCapability } from './meta/index.js';
import { operationsCapability } from './operations/index.js';
import { resourcesCapability } from './resources/index.js';
import { workspaceCapability } from './workspace/index.js';

export const capabilities: Capability[] = [
  metaCapability,
  workspaceCapability,
  entriesCapability,
  entryTypesCapability,
  collectionsCapability,
  assetsCapability,
  resourcesCapability,
  formsCapability, // read-only forms + submissions — only active with a user token
  insightsCapability, // AI executions, AI policy, event log, task history — user token only
  operationsCapability, // authoring (AI operations + compose) — only active with a user token
];

export function registerCapabilities(context: CapabilityContext): void {
  for (const capability of capabilities) {
    capability.register(context);
  }
}
