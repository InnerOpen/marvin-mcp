import { pick, rawJson } from './common.js';

export function serializeResourceSummary(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'name',
    'slug',
    'resourceType',
    'description',
    'externalId',
    'url',
    'entries',
    'createdAt',
    'updatedAt',
  ]);
}

export function serializeResource(value: unknown) {
  const resource = rawJson(value);
  return {
    ...serializeResourceSummary(resource),
    metadataJson: resource.metadataJson,
  };
}
