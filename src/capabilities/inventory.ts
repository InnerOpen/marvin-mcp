export interface SdkCapabilityInventoryItem {
  sdkModule: string;
  purpose: string;
  auth: 'site token' | 'user token/session' | 'mixed' | 'none';
  readWrite: 'read' | 'write' | 'read/write';
  exportedObjects: string[];
  relationships: string;
  maturity: string;
  recommendedMcpMapping: string;
  firstReleaseExposure: string;
}

export const sdkCapabilityInventory: SdkCapabilityInventoryItem[] = [
  {
    sdkModule: 'Publishing Workspace',
    purpose: 'Workspace identity and published site configuration.',
    auth: 'site token',
    readWrite: 'read',
    exportedObjects: ['MarvinClient', 'Workspace', 'MarvinSite'],
    relationships:
      'Workspace owns publishing entries, collections, assets, resources, and site settings.',
    maturity: 'Stable read surface in @inneropen/marvin-sdk/publish.',
    recommendedMcpMapping: 'Resources plus a concise workspace inspection tool.',
    firstReleaseExposure: 'marvin_get_workspace, marvin://workspace, marvin://workspace/site',
  },
  {
    sdkModule: 'Publishing Entries',
    purpose: 'Read published content entries by list filters or slug.',
    auth: 'site token',
    readWrite: 'read',
    exportedObjects: ['Entry', 'MarvinEntry', 'GetEntriesOptions'],
    relationships: 'Entries reference entry types, collections, assets, and resources.',
    maturity: 'Stable read list; get returns null for missing entries in 2.0.0-next.17.',
    recommendedMcpMapping: 'Tools for list/find and resources for stable entry context.',
    firstReleaseExposure: 'marvin_list_entries, marvin_get_entry, marvin://entries/{slug}',
  },
  {
    sdkModule: 'Publishing Collections',
    purpose: 'Read published collections and their entries.',
    auth: 'site token',
    readWrite: 'read',
    exportedObjects: ['Collection', 'MarvinCollection'],
    relationships: 'Collections group entries; collection detail may contain entries.',
    maturity: 'Stable read list; get returns null for missing collections in 2.0.0-next.17.',
    recommendedMcpMapping: 'Tools for collection review and resources for collection context.',
    firstReleaseExposure:
      'marvin_list_collections, marvin_get_collection, marvin_get_collection_entries, marvin://collections/{slug}',
  },
  {
    sdkModule: 'Publishing Assets',
    purpose: 'Read published asset metadata.',
    auth: 'site token',
    readWrite: 'read',
    exportedObjects: ['MarvinAsset', 'GetAssetsOptions'],
    relationships: 'Assets can be referenced by entries.',
    maturity:
      'Stable read list/get metadata; binary payloads are outside MCP output normalization.',
    recommendedMcpMapping: 'Tools/resources returning metadata only.',
    firstReleaseExposure: 'marvin_list_assets',
  },
  {
    sdkModule: 'Publishing Resources',
    purpose: 'Read reusable structured resources and related entries.',
    auth: 'site token',
    readWrite: 'read',
    exportedObjects: ['Resource', 'MarvinResource', 'GetResourcesOptions'],
    relationships: 'Resources can be referenced by entries.',
    maturity: 'Stable read list/get; resource entries method exists in SDK.',
    recommendedMcpMapping: 'Tools and resources for reviewing reusable references.',
    firstReleaseExposure: 'marvin_list_resources, marvin_get_resource, marvin://resources/{slug}',
  },
  {
    sdkModule: 'Platform Entries',
    purpose: 'Authenticated CRUD for draft/editorial entries and collection membership.',
    auth: 'user token/session',
    readWrite: 'read/write',
    exportedObjects: [
      'PlatformClient',
      'EntriesModule',
      'PlatformEntryCreate',
      'PlatformEntryUpdate',
    ],
    relationships: 'Can add/remove entries from collections by ID.',
    maturity: 'Available in @inneropen/marvin-sdk/platform; requires platform authentication.',
    recommendedMcpMapping: 'Conservative editor tools after credential/permission design is added.',
    firstReleaseExposure: 'Not exposed; first release uses site-token publishing client only.',
  },
  {
    sdkModule: 'Platform Entry Types',
    purpose: 'Authenticated schema management for entry types.',
    auth: 'user token/session',
    readWrite: 'read/write',
    exportedObjects: ['EntryTypesModule', 'PlatformEntryType'],
    relationships: 'Entry types define schemas used by entries.',
    maturity: 'Available in platform SDK; potentially administrative.',
    recommendedMcpMapping: 'Resources for schema review; admin tools later with permissions.',
    firstReleaseExposure: 'marvin://entry-types inferred from publishing entries.',
  },
  {
    sdkModule: 'Platform Collections/Assets/Resources/Forms',
    purpose: 'Authenticated management for content grouping, media, references, and forms.',
    auth: 'user token/session',
    readWrite: 'read/write',
    exportedObjects: [
      'CollectionsModule',
      'AssetsModule',
      'ResourcesModule',
      'FormsModule',
      'PlatformCollection',
      'PlatformAsset',
      'PlatformResource',
      'PlatformForm',
    ],
    relationships: 'Platform modules manage objects that publishing entries expose read-only.',
    maturity: 'Available in platform SDK; some operations are destructive or upload-oriented.',
    recommendedMcpMapping:
      'Capability-specific tools after permission-aware registration and write safety are designed.',
    firstReleaseExposure: 'Read-only publishing equivalents only.',
  },
  {
    sdkModule: 'Platform Administration',
    purpose:
      'Authenticated workspace, users, invites, webhooks, API clients, maintenance, tasks, and theme.',
    auth: 'user token/session',
    readWrite: 'read/write',
    exportedObjects: [
      'WorkspacesModule',
      'WorkspaceMembersModule',
      'APIClientsModule',
      'AdminUsersModule',
      'AdminSystemModule',
      'AdminMaintenanceModule',
      'WebhooksModule',
      'ScheduledTasksModule',
    ],
    relationships:
      'Administrative modules affect authorization, secrets/tokens, users, system state.',
    maturity: 'Available in platform SDK; high-impact operations.',
    recommendedMcpMapping: 'Mostly future admin capabilities; do not expose in first release.',
    firstReleaseExposure: 'Not exposed.',
  },
];

export const publicCapabilitySummaries = [
  {
    id: 'workspace',
    title: 'Workspace',
    summary: 'Inspect configured workspace identity and public site settings.',
  },
  {
    id: 'entries',
    title: 'Entries',
    summary: 'List, find, and inspect published Marvin entries.',
  },
  {
    id: 'entry-types',
    title: 'Entry Types',
    summary: 'Inspect entry type information inferred from published entries.',
  },
  {
    id: 'collections',
    title: 'Collections',
    summary: 'Review published Marvin collections and their entries.',
  },
  {
    id: 'assets',
    title: 'Assets',
    summary: 'Review published Marvin asset metadata without returning binary payloads.',
  },
  {
    id: 'resources',
    title: 'Resources',
    summary: 'Review reusable Marvin structured resources.',
  },
];
