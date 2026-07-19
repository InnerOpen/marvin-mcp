import { pick, rawJson } from './common.js';

export function serializeFormSummary(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'name',
    'slug',
    'description',
    'enabled',
    'status',
    'createdAt',
    'updatedAt',
  ]);
}

export function serializeForm(value: unknown) {
  const form = rawJson(value);
  return {
    ...serializeFormSummary(form),
    schemaJson: form.schemaJson,
    settings: form.settings,
  };
}

export function serializeFormSubmission(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'formId',
    'status',
    'dataJson',
    'metadataJson',
    'classification',
    'submittedAt',
    'createdAt',
  ]);
}
