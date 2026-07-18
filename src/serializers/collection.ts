import { pick, rawJson } from './common.js';

export function serializeCollectionSummary(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'name',
    'slug',
    'description',
    'icon',
    'color',
    'metadataJson',
    'sortOrder',
    'isSmart',
    'entryCount',
    'createdAt',
    'updatedAt',
  ]);
}

export function serializeEntryCollection(value: unknown) {
  const ec = rawJson(value);
  return {
    collection: ec.collection ? serializeCollectionSummary(ec.collection) : undefined,
    entryMetadata: ec.entryMetadata ?? {
      role: ec.role ?? null,
      position: ec.position ?? 0,
      metadataJson: ec.metadataJson ?? null,
    },
  };
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

export function serializeCollectionEntry(value: unknown) {
  const entry = rawJson(value);
  const collection = entry.collection ? rawJson(entry.collection) : undefined;
  return {
    slug: entry.slug,
    title: entry.title,
    entryType: entry.entryType,
    summary: entry.summary,
    status: entry.status,
    publishedAt: entry.publishedAt,
    metadataJson: entry.metadataJson,
    collection: collection
      ? {
          slug: collection.slug,
          name: collection.name,
          description: collection.description,
          metadataJson: collection.metadataJson,
          entryMetadata: collection.entryMetadata,
        }
      : undefined,
    collectionSlugs: entry.collectionSlugs,
    assetSlugs: entry.assetSlugs,
    resourceSlugs: entry.resourceSlugs,
    order: entry.order,
  };
}
