import { pick, rawJson } from './common.js';

export function serializeWorkspaceInfo(value: unknown) {
  return pick(rawJson(value), ['slug', 'name']);
}

export function serializeSite(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'name',
    'slug',
    'title',
    'tagline',
    'description',
    'canonicalUrl',
    'logo',
    'favicon',
    'locale',
    'timezone',
    'metadata',
  ]);
}
