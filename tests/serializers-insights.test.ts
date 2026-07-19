import { describe, expect, it } from 'vitest';
import { serializeEntryType, serializeEntryTypeSummary } from '../src/serializers/entryType.js';
import {
  serializeAiExecution,
  serializeAiExecutionDetail,
  serializeAiSettings,
  serializeEventLog,
  serializeScheduledTask,
  serializeScheduledTaskLog,
} from '../src/serializers/insights.js';
import { serializeForm, serializeFormSubmission, serializeFormSummary } from '../src/serializers/form.js';

describe('serializeEntryType', () => {
  const fullType = {
    id: 'et-1',
    groupId: 'g-1',
    name: 'Article',
    slug: 'article',
    icon: 'doc',
    color: '#fff',
    description: 'An article',
    sortOrder: 3,
    isSystem: false,
    isRendered: true,
    schemaJson: { fields: [{ key: 'body', type: 'markdown' }] },
    renderingJson: { renderer: 'astro' },
    capabilitiesJson: { publishable: true },
    recipeJson: { assets: { min: 0 } },
    createdAt: '2026-01-01',
    updateAt: '2026-01-02',
  };

  it('summary picks safe fields and excludes JSON blobs', () => {
    const result = serializeEntryTypeSummary(fullType);
    expect(result).toHaveProperty('slug', 'article');
    expect(result).toHaveProperty('sortOrder', 3);
    expect(result).not.toHaveProperty('schemaJson');
    expect(result).not.toHaveProperty('groupId');
  });

  it('full serializer includes schema + recipe (needed for compose)', () => {
    const result = serializeEntryType(fullType);
    expect(result.schemaJson).toEqual({ fields: [{ key: 'body', type: 'markdown' }] });
    expect(result.recipeJson).toEqual({ assets: { min: 0 } });
    expect(result).toHaveProperty('name', 'Article');
  });
});

describe('serializeAiSettings', () => {
  it('NEVER exposes secretRef, but keeps policy fields', () => {
    const result = serializeAiSettings({
      enabled: true,
      credentialMode: 'workspace',
      provider: 'openai',
      model: 'gpt-4o',
      secretRef: 'super-secret-pointer',
      approvalMode: 'suggest-only',
      invocationSources: { mcp: true },
      loggingConfig: { log_inputs: false },
    });
    expect(result).not.toHaveProperty('secretRef');
    expect(result).toHaveProperty('enabled', true);
    expect(result).toHaveProperty('approvalMode', 'suggest-only');
    expect(result.invocationSources).toEqual({ mcp: true });
  });
});

describe('serializeAiExecution', () => {
  const execution = {
    id: 'x-1',
    operationSlug: 'compose-entry',
    providerType: 'openai',
    modelId: 'gpt-4o',
    status: 'completed',
    triggerType: 'mcp',
    entityType: 'entry',
    entityId: 'e-1',
    totalTokens: 735,
    estimatedCostUsd: 0.0004,
    outputJson: { entry_id: 'e-1', fields: { body: 'secret-ish content' } },
    groupId: 'g-1',
  };

  it('summary omits outputJson and internal groupId', () => {
    const result = serializeAiExecution(execution);
    expect(result).toHaveProperty('operationSlug', 'compose-entry');
    expect(result).toHaveProperty('totalTokens', 735);
    expect(result).not.toHaveProperty('outputJson');
    expect(result).not.toHaveProperty('groupId');
  });

  it('detail includes outputJson', () => {
    const result = serializeAiExecutionDetail(execution);
    expect(result.outputJson).toEqual({ entry_id: 'e-1', fields: { body: 'secret-ish content' } });
  });
});

describe('serializeEventLog', () => {
  it('picks event fields', () => {
    const result = serializeEventLog({
      id: 'ev-1',
      eventId: 'evt_abc',
      eventType: 'entry_created',
      occurredAt: '2026-01-01',
      entityType: 'entry',
      entityId: 'e-1',
      messageTitle: 'Entry created',
      internalCursor: 'drop-me',
    });
    expect(result).toHaveProperty('eventType', 'entry_created');
    expect(result).not.toHaveProperty('internalCursor');
  });
});

describe('serializeScheduledTask', () => {
  it('picks task fields', () => {
    const result = serializeScheduledTask({
      id: 't-1',
      name: 'Prune logs',
      slug: 'prune-logs',
      enabled: true,
      taskType: 'prune_event_logs',
      lastStatus: 'success',
      taskConfig: { secret: 'should-not-leak' },
    });
    expect(result).toHaveProperty('taskType', 'prune_event_logs');
    expect(result).toHaveProperty('lastStatus', 'success');
    expect(result).not.toHaveProperty('taskConfig');
  });

  it('log serializer picks run fields', () => {
    const result = serializeScheduledTaskLog({
      id: 'run-1',
      taskId: 't-1',
      status: 'success',
      durationMs: 42,
      startedAt: '2026-01-01',
    });
    expect(result).toHaveProperty('status', 'success');
    expect(result).toHaveProperty('durationMs', 42);
  });
});

describe('serializeForm', () => {
  const form = {
    id: 'f-1',
    name: 'Contact',
    slug: 'contact',
    enabled: true,
    schemaJson: { fields: [] },
    settings: { notify: true },
    internalToken: 'drop-me',
  };

  it('summary excludes schema + internals', () => {
    const result = serializeFormSummary(form);
    expect(result).toHaveProperty('slug', 'contact');
    expect(result).not.toHaveProperty('schemaJson');
    expect(result).not.toHaveProperty('internalToken');
  });

  it('full form includes schema + settings', () => {
    const result = serializeForm(form);
    expect(result.schemaJson).toEqual({ fields: [] });
    expect(result.settings).toEqual({ notify: true });
  });

  it('submission picks safe fields', () => {
    const result = serializeFormSubmission({
      id: 's-1',
      formId: 'f-1',
      status: 'new',
      dataJson: { email: 'a@b.com' },
      submittedAt: '2026-01-01',
      internalIp: '10.0.0.1',
    });
    expect(result).toHaveProperty('dataJson');
    expect(result).not.toHaveProperty('internalIp');
  });
});
