import { createMarvinClient } from '@inneropen/marvin-sdk/publish';
import type { MarvinConfig } from '@inneropen/marvin-sdk/publish';
import { createPlatformClient } from '@inneropen/marvin-sdk/platform';
import type { PlatformClient } from '@inneropen/marvin-sdk/platform';
import type {
  GetAssetsOptions,
  GetEntriesOptions,
  GetResourcesOptions,
} from '@inneropen/marvin-sdk/publish';
import type { MarvinMcpConfig } from './config.js';
import { toSdkConfig } from './config.js';

export interface MarvinClientLike {
  getWorkspace(): Promise<unknown>;
  getWorkspaceInfo(): Promise<{ slug: string; name: string }>;
  getSite(): Promise<unknown>;
  getEntries(options?: GetEntriesOptions): Promise<unknown[]>;
  getEntry(slug: string): Promise<unknown | null>;
  getCollections(): Promise<unknown[]>;
  getCollection(slug: string): Promise<unknown | null>;
  getCollectionEntries(slug: string): Promise<unknown[]>;
  getAssets(options?: GetAssetsOptions): Promise<unknown[]>;
  getResources(options?: GetResourcesOptions): Promise<unknown[]>;
  getResource(slug: string): Promise<unknown>;
  getResourceEntries(slug: string): Promise<unknown[]>;
}

export function createMarvinSdkClient(config: MarvinMcpConfig): MarvinClientLike {
  return createMarvinClient(toSdkConfig(config) as MarvinConfig) as MarvinClientLike;
}

/**
 * The authenticated platform client — only when a user token is configured. Powers the
 * authoring capabilities (AI operations + compose). Server-side gating (min_role,
 * invocation_sources) still applies to every call.
 */
export function createMarvinPlatformClient(config: MarvinMcpConfig): PlatformClient | undefined {
  if (!config.userToken) return undefined;
  return createPlatformClient({ apiUrl: config.apiUrl, userToken: config.userToken });
}
