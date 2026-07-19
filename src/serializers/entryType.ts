import { pick, rawJson } from './common.js';

export function serializeEntryTypeSummary(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'name',
    'slug',
    'icon',
    'color',
    'description',
    'sortOrder',
    'isSystem',
    'isRendered',
    'createdAt',
    // backend emits `updateAt` on entry types; accept both spellings.
    'updateAt',
    'updatedAt',
  ]);
}

export function serializeEntryType(value: unknown) {
  const entryType = rawJson(value);
  return {
    ...serializeEntryTypeSummary(entryType),
    schemaJson: entryType.schemaJson,
    renderingJson: entryType.renderingJson,
    capabilitiesJson: entryType.capabilitiesJson,
    recipeJson: entryType.recipeJson,
  };
}
