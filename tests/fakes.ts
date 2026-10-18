import type { MarvinClientLike } from '../src/client.js';
import type { MarvinMcpConfig } from '../src/config.js';
import type { Logger } from '../src/logger.js';

export const testConfig: MarvinMcpConfig = {
  apiUrl: 'https://marvin.example.com',
  siteClientToken: 'secret-token',
  workspaceSlug: 'demo',
  logLevel: 'silent',
  readOnly: true,
};

export const silentLogger: Logger = {
  error: () => undefined,
  warn: () => undefined,
  info: () => undefined,
  debug: () => undefined,
};

export function createFakeClient(): MarvinClientLike {
  return {
    getWorkspace: async () => ({ slug: 'demo', site: { title: 'Demo' } }),
    getWorkspaceInfo: async () => ({ slug: 'demo', name: 'Demo Workspace' }),
    getSite: async () => ({ id: 'site-1', name: 'Demo', slug: 'demo', title: 'Demo Site' }),
    getEntries: async () => [
      {
        id: 'entry-1',
        title: 'About',
        slug: 'about',
        status: 'published',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
        entryTypeId: 'page-type',
        entryType: { id: 'page-type', name: 'Page', slug: 'page', sortOrder: 1, isSystem: false },
      },
    ],
    getEntry: async (slug) => ({
      id: 'entry-1',
      title: 'About',
      slug,
      status: 'published',
      dataJson: { body: 'Hello' },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
      entryTypeId: 'page-type',
    }),
    getCollections: async () => [
      {
        id: 'collection-1',
        name: 'Pages',
        slug: 'pages',
        sortOrder: 1,
        isSmart: false,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
      },
    ],
    getCollection: async (slug) => ({
      id: 'collection-1',
      name: 'Pages',
      slug,
      sortOrder: 1,
      isSmart: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
      entries: [],
    }),
    getCollectionEntries: async () => [],
  };
}

/** Minimal platform stub exposing only `resources.list` — what the resources capability reads. */
export function createFakePlatform() {
  return {
    resources: {
      list: async () => [
        {
          id: 'resource-1',
          name: 'Fabric',
          slug: 'fabric',
          resourceType: 'material',
          metadataJson: { weight: '10oz' },
          createdAt: '2026-01-01',
          updatedAt: '2026-01-02',
        },
      ],
    },
  } as any;
}
