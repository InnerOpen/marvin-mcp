import { describe, expect, it } from 'vitest';
import { rawJson, pick, jsonText } from '../src/serializers/common.js';
import { serializeAsset } from '../src/serializers/asset.js';
import { serializeEntry, serializeEntrySummary } from '../src/serializers/entry.js';
import {
  serializeCollection,
  serializeCollectionSummary,
} from '../src/serializers/collection.js';
import {
  serializeResource,
  serializeResourceSummary,
} from '../src/serializers/resource.js';
import { serializeWorkspaceInfo, serializeSite } from '../src/serializers/workspace.js';

describe('common utilities', () => {
  describe('rawJson', () => {
    it('unwraps toJSON method', () => {
      const obj = { toJSON: () => ({ id: 1 }) };
      expect(rawJson(obj)).toEqual({ id: 1 });
    });

    it('returns plain objects as-is', () => {
      expect(rawJson({ id: 1 })).toEqual({ id: 1 });
    });

    it('returns empty object for arrays', () => {
      expect(rawJson([1, 2, 3])).toEqual({});
    });

    it('returns empty object for null', () => {
      expect(rawJson(null)).toEqual({});
    });

    it('returns empty object for primitives', () => {
      expect(rawJson('string')).toEqual({});
      expect(rawJson(42)).toEqual({});
    });

    it('returns empty object when toJSON returns non-object', () => {
      expect(rawJson({ toJSON: () => 'string' })).toEqual({});
      expect(rawJson({ toJSON: () => [1, 2] })).toEqual({});
    });
  });

  describe('pick', () => {
    it('selects specified keys', () => {
      expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('omits undefined values', () => {
      expect(pick({ a: 1, b: undefined }, ['a', 'b'])).toEqual({ a: 1 });
    });

    it('omits keys not present on object', () => {
      expect(pick({ a: 1 }, ['a', 'b'])).toEqual({ a: 1 });
    });

    it('returns empty object for empty keys', () => {
      expect(pick({ a: 1 }, [])).toEqual({});
    });
  });

  describe('jsonText', () => {
    it('pretty-prints JSON with 2-space indent', () => {
      expect(jsonText({ a: 1 })).toBe('{\n  "a": 1\n}');
    });
  });
});

describe('serializeAsset', () => {
  const fullAsset = {
    id: 'asset-1',
    slug: 'hero',
    name: 'Hero Image',
    originalFilename: 'hero.jpg',
    filename: 'hero.jpg',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    assetType: 'image',
    fileSize: 10240,
    width: 1920,
    height: 1080,
    publicUrl: 'https://cdn.example.com/hero.jpg',
    altText: 'Hero banner',
    description: 'Main hero image',
    metadata: { quality: 'high' },
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
    storageKey: 'private/path',
    checksum: 'abc123',
    storageProvider: 's3',
    uploadedBy: 'admin',
  };

  it('includes safe fields', () => {
    const result = serializeAsset(fullAsset);
    expect(result).toHaveProperty('id', 'asset-1');
    expect(result).toHaveProperty('publicUrl');
    expect(result).toHaveProperty('altText');
    expect(result).toHaveProperty('width', 1920);
    expect(result).toHaveProperty('height', 1080);
  });

  it('excludes storage internals', () => {
    const result = serializeAsset(fullAsset);
    expect(result).not.toHaveProperty('storageKey');
    expect(result).not.toHaveProperty('checksum');
    expect(result).not.toHaveProperty('storageProvider');
    expect(result).not.toHaveProperty('uploadedBy');
  });

  it('handles toJSON wrapper', () => {
    const wrapped = { toJSON: () => fullAsset };
    const result = serializeAsset(wrapped);
    expect(result).toHaveProperty('id', 'asset-1');
    expect(result).not.toHaveProperty('storageKey');
  });
});

describe('serializeEntrySummary', () => {
  it('picks summary fields', () => {
    const result = serializeEntrySummary({
      id: 'e1',
      title: 'Test',
      slug: 'test',
      status: 'published',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
      entryTypeId: 'page',
      dataJson: { body: 'should be excluded' },
    });

    expect(result).toHaveProperty('id', 'e1');
    expect(result).toHaveProperty('title', 'Test');
    expect(result).not.toHaveProperty('dataJson');
  });
});

describe('serializeEntry', () => {
  it('serializes rich SDK objects via toJSON', () => {
    const entry = serializeEntry({
      toJSON: () => ({
        id: '1',
        title: 'Hello',
        slug: 'hello',
        status: 'published',
        dataJson: { body: 'Hi' },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
        entryTypeId: 'page',
      }),
    });

    expect(entry).toMatchObject({ id: '1', slug: 'hello', dataJson: { body: 'Hi' } });
  });

  it('includes nested collections, assets, and resources', () => {
    const entry = serializeEntry({
      id: 'e1',
      title: 'Test',
      slug: 'test',
      status: 'published',
      collections: [{ id: 'c1', name: 'Pages', slug: 'pages' }],
      assets: [{ id: 'a1', slug: 'hero', name: 'Hero' }],
      resources: [{ id: 'r1', name: 'Fabric', slug: 'fabric', resourceType: 'material' }],
    });

    expect(entry.collections).toHaveLength(1);
    expect(entry.collections![0]).toHaveProperty('slug', 'pages');
    expect(entry.assets).toHaveLength(1);
    expect(entry.resources).toHaveLength(1);
  });

  it('returns undefined for missing nested arrays', () => {
    const entry = serializeEntry({ id: 'e1', title: 'Test', slug: 'test' });
    expect(entry.collections).toBeUndefined();
    expect(entry.assets).toBeUndefined();
    expect(entry.resources).toBeUndefined();
  });
});

describe('serializeCollectionSummary', () => {
  it('picks collection summary fields', () => {
    const result = serializeCollectionSummary({
      id: 'c1',
      name: 'Pages',
      slug: 'pages',
      description: 'All pages',
      sortOrder: 1,
      isSmart: false,
      entryCount: 10,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
      internalField: 'should be excluded',
    });

    expect(result).toHaveProperty('id', 'c1');
    expect(result).toHaveProperty('name', 'Pages');
    expect(result).toHaveProperty('entryCount', 10);
    expect(result).not.toHaveProperty('internalField');
  });
});

describe('serializeCollection', () => {
  it('extends summary with smartRules and entries', () => {
    const result = serializeCollection({
      id: 'c1',
      name: 'Pages',
      slug: 'pages',
      sortOrder: 1,
      isSmart: true,
      smartRules: [{ field: 'status', value: 'published' }],
      entries: [
        { id: 'e1', title: 'About', slug: 'about', status: 'published' },
      ],
    });

    expect(result).toHaveProperty('smartRules');
    expect(result.entries).toHaveLength(1);
    expect(result.entries![0]).toHaveProperty('slug', 'about');
  });

  it('returns undefined entries when not present', () => {
    const result = serializeCollection({
      id: 'c1',
      name: 'Pages',
      slug: 'pages',
    });

    expect(result.entries).toBeUndefined();
  });
});

describe('serializeResourceSummary', () => {
  it('picks resource summary fields', () => {
    const result = serializeResourceSummary({
      id: 'r1',
      name: 'Fabric',
      slug: 'fabric',
      resourceType: 'material',
      description: 'A material',
      externalId: 'ext-1',
      url: 'https://example.com',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
      internalField: 'excluded',
    });

    expect(result).toHaveProperty('resourceType', 'material');
    expect(result).not.toHaveProperty('internalField');
  });
});

describe('serializeResource', () => {
  it('extends summary with metadata', () => {
    const result = serializeResource({
      id: 'r1',
      name: 'Fabric',
      slug: 'fabric',
      resourceType: 'material',
      metadata: { weight: '10oz' },
    });

    expect(result).toHaveProperty('metadata', { weight: '10oz' });
  });
});

describe('serializeWorkspaceInfo', () => {
  it('picks slug and name', () => {
    const result = serializeWorkspaceInfo({
      slug: 'demo',
      name: 'Demo Workspace',
      internalId: 'secret',
    });

    expect(result).toEqual({ slug: 'demo', name: 'Demo Workspace' });
    expect(result).not.toHaveProperty('internalId');
  });
});

describe('serializeSite', () => {
  it('picks site fields', () => {
    const result = serializeSite({
      id: 'site-1',
      name: 'Demo',
      slug: 'demo',
      title: 'Demo Site',
      tagline: 'A demo',
      description: 'Demo description',
      canonicalUrl: 'https://demo.example.com',
      logo: 'logo.png',
      favicon: 'favicon.ico',
      locale: 'en-US',
      timezone: 'UTC',
      metadata: { theme: 'dark' },
      secretKey: 'should be excluded',
    });

    expect(result).toHaveProperty('id', 'site-1');
    expect(result).toHaveProperty('title', 'Demo Site');
    expect(result).toHaveProperty('locale', 'en-US');
    expect(result).not.toHaveProperty('secretKey');
  });
});
