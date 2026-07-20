import type { Capability, CapabilityContext } from './types.js';
import { assetsCapability } from './assets/index.js';
import { collectionsCapability } from './collections/index.js';
import { entriesCapability } from './entries/index.js';
import { entryTypesCapability } from './entry-types/index.js';
import { metaCapability } from './meta/index.js';
import { operationsCapability } from './operations/index.js';
import { resourcesCapability } from './resources/index.js';
import { toolsCapability } from './tools/index.js';
import { workflowsCapability } from './workflows/index.js';
import { workspaceCapability } from './workspace/index.js';

// NOTE (removed capabilities):
//  - `insights` (AI executions / settings / events / task history) moved to the core tool registry —
//    it's now projected by `toolsCapability` (marvin_list_ai_executions, marvin_get_ai_settings, …),
//    so those tools have one source of truth again.
//  - `forms` was removed because forms aren't implemented on the backend yet. When they land, project
//    the forms read tools via the core registry (add ToolSpecs in Marvin), NOT a hand-written capability.
export const capabilities: Capability[] = [
  metaCapability,
  workspaceCapability,
  entriesCapability,
  entryTypesCapability,
  collectionsCapability,
  assetsCapability,
  resourcesCapability,
  operationsCapability, // authoring (AI operations + compose) — only active with a user token
  toolsCapability, // core read/query tools projected from the registry (incl. insights) — user token only
  workflowsCapability, // MCP-exposed workflows (automations) run as tools — user token only
];

export function registerCapabilities(context: CapabilityContext): void {
  for (const capability of capabilities) {
    capability.register(context);
  }
}
