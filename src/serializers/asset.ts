import { pick, rawJson } from './common.js';

export function serializeAsset(value: unknown) {
  const asset = rawJson(value);
  return {
    ...pick(asset, [
      'slug',
      'name',
      'mimeType',
      'assetType',
      'fileSize',
      'width',
      'height',
      'publicUrl',
      'altText',
      'description',
      'metadataJson',
    ]),
    ...(asset.entryMetadata !== undefined ? { entryMetadata: asset.entryMetadata } : {}),
  };
}
