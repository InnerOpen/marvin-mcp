import { describe, expect, it } from 'vitest';
import { serializeAsset } from '../src/serializers/asset.js';
import { serializeEntry } from '../src/serializers/entry.js';

describe('serializers', () => {
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

  it('does not expose asset storage internals', () => {
    const asset = serializeAsset({
      id: 'asset',
      slug: 'hero',
      storageKey: 'private/path',
      checksum: 'checksum',
      publicUrl: 'https://cdn.example.com/hero.jpg',
    });

    expect(asset).toHaveProperty('publicUrl');
    expect(asset).not.toHaveProperty('storageKey');
    expect(asset).not.toHaveProperty('checksum');
  });
});
