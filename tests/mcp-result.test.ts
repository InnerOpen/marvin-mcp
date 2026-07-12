import { describe, expect, it } from 'vitest';
import { toolSuccess, toolError, jsonResource, resourceError } from '../src/mcp-result.js';

describe('toolSuccess', () => {
  it('returns text content and structured data', () => {
    const result = toolSuccess('Found 3 items.', { items: [1, 2, 3], count: 3 });

    expect(result.content).toEqual([{ type: 'text', text: 'Found 3 items.' }]);
    expect(result.structuredContent).toEqual({ items: [1, 2, 3], count: 3 });
    expect(result.isError).toBeUndefined();
  });
});

describe('toolError', () => {
  it('returns isError true with normalized error', () => {
    const result = toolError(new Error('something broke'), 'Testing');

    expect(result.isError).toBe(true);
    const first = result.content[0]!;
    expect(first.type).toBe('text');
    expect((first as { text: string }).text).toBeTruthy();
    expect(result.structuredContent!.error).toHaveProperty('code');
    expect(result.structuredContent!.error).toHaveProperty('message');
    expect(result.structuredContent!.error).toHaveProperty('suggestion');
  });

  it('normalizes a 401 error', () => {
    const error = Object.assign(new Error('unauthorized'), { status: 401 });
    const result = toolError(error, 'Testing');

    expect((result.structuredContent!.error as any).code).toBe('authentication_failed');
  });
});

describe('jsonResource', () => {
  it('returns JSON resource with correct mime type and URI', () => {
    const result = jsonResource('marvin://test', { key: 'value' });

    expect(result.contents).toHaveLength(1);
    const content = result.contents[0]! as { uri: string; mimeType?: string; text: string };
    expect(content.uri).toBe('marvin://test');
    expect(content.mimeType).toBe('application/json');
    expect(JSON.parse(content.text)).toEqual({ key: 'value' });
  });
});

describe('resourceError', () => {
  it('wraps normalized error as a JSON resource', () => {
    const result = resourceError('marvin://test', new Error('fail'), 'Testing');
    const parsed = JSON.parse((result.contents[0]! as { text: string }).text);

    expect(parsed.error).toHaveProperty('code');
    expect(parsed.error).toHaveProperty('message');
  });
});
