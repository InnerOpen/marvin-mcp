import { pick, rawJson } from './common.js';
import { serializeAsset } from './asset.js';
import { serializeEntryCollection } from './collection.js';
import { serializeResourceSummary } from './resource.js';

export function serializeEntrySummary(value: unknown) {
  const entry = rawJson(value);
  return pick(entry, [
    'id',
    'title',
    'slug',
    'summary',
    'description',
    'status',
    'publishedAt',
    'createdAt',
    'updatedAt',
    'entryTypeId',
    'entryType',
  ]);
}

export function serializeEntry(value: unknown) {
  const entry = rawJson(value);
  return {
    ...serializeEntrySummary(entry),
    dataJson: entry.dataJson,
    contentMarkdown: entry.contentMarkdown,
    metadataJson: entry.metadataJson,
    collections: Array.isArray(entry.collections)
      ? entry.collections.map(serializeEntryCollection)
      : undefined,
    assets: Array.isArray(entry.assets) ? entry.assets.map(serializeAsset) : undefined,
    resources: Array.isArray(entry.resources)
      ? entry.resources.map(serializeResourceSummary)
      : undefined,
    tags: Array.isArray(entry.tags) ? entry.tags : undefined,
  };
}
