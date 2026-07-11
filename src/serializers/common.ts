export type JsonObject = Record<string, unknown>;

export function rawJson(value: unknown): JsonObject {
  const raw =
    value && typeof value === 'object' && 'toJSON' in value
      ? (value as { toJSON(): unknown }).toJSON()
      : value;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as JsonObject;
}

export function pick(object: JsonObject, keys: string[]): JsonObject {
  return Object.fromEntries(
    keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]),
  );
}

export function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
