import { pick, rawJson } from './common.js';

export function serializeCollectionSummary(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'name',
    'slug',
    'description',
    'icon',
    'color',
    'role',
    'placementMetadataJson',
    'sortOrder',
    'isSmart',
    'entryCount',
    'createdAt',
    'updatedAt',
  ]);
}

export function serializeCollection(value: unknown) {
  const collection = rawJson(value);
  return {
    ...serializeCollectionSummary(collection),
    smartRules: collection.smartRules,
    entries: Array.isArray(collection.entries)
      ? collection.entries.map((entry) =>
          pick(rawJson(entry), [
            'id',
            'title',
            'slug',
            'summary',
            'status',
            'publishedAt',
            'createdAt',
            'updatedAt',
            'entryTypeId',
          ]),
        )
      : undefined,
  };
}
