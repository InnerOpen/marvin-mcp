import { pick, rawJson } from './common.js';

export function serializeAsset(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'slug',
    'name',
    'originalFilename',
    'filename',
    'extension',
    'mimeType',
    'assetType',
    'fileSize',
    'width',
    'height',
    'publicUrl',
    'altText',
    'description',
    'metadataJson',
    'createdAt',
    'updatedAt',
  ]);
}
