import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { normalizeError } from './errors/normalize-error.js';
import { jsonText } from './serializers/common.js';

export function toolSuccess(text: string, data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text }],
    structuredContent: data as Record<string, unknown>,
  };
}

export function toolError(error: unknown, context: string): CallToolResult {
  const normalized = normalizeError(error, context);
  return {
    isError: true,
    content: [{ type: 'text', text: `${normalized.message} ${normalized.suggestion}` }],
    structuredContent: { error: normalized },
  };
}

export function jsonResource(uri: string, value: unknown): ReadResourceResult {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: jsonText(value),
      },
    ],
  };
}

export function resourceError(uri: string, error: unknown, context: string): ReadResourceResult {
  return jsonResource(uri, { error: normalizeError(error, context) });
}
