import { pick, rawJson } from './common.js';

/** AI execution summary — audit metadata without the (potentially large) output payload. */
export function serializeAiExecution(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'operationSlug',
    'providerType',
    'modelId',
    'status',
    'triggeredBy',
    'triggerType',
    'entityType',
    'entityId',
    'promptTokens',
    'completionTokens',
    'totalTokens',
    'estimatedCostUsd',
    'durationMs',
    'errorMessage',
    'startedAt',
    'completedAt',
    'createdAt',
  ]);
}

/** Full AI execution, including the generated output. */
export function serializeAiExecutionDetail(value: unknown) {
  const execution = rawJson(value);
  return { ...serializeAiExecution(execution), outputJson: execution.outputJson };
}

/**
 * Workspace AI policy. `secretRef` is intentionally omitted — it is an internal pointer to a
 * stored credential and is of no use (and some risk) to an MCP consumer.
 */
export function serializeAiSettings(value: unknown) {
  return pick(rawJson(value), [
    'enabled',
    'credentialMode',
    'allowWorkspaceCredentials',
    'provider',
    'model',
    'approvalMode',
    'invocationSources',
    'operationOverrides',
    'budgetConfig',
    'loggingConfig',
    'moderationConfig',
  ]);
}

export function serializeEventLog(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'eventId',
    'eventType',
    'occurredAt',
    'workspaceId',
    'userId',
    'entityId',
    'entityType',
    'messageTitle',
    'messageBody',
  ]);
}

export function serializeScheduledTask(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'name',
    'slug',
    'description',
    'enabled',
    'scheduleType',
    'taskType',
    'lastRunAt',
    'nextRunAt',
    'lastStatus',
    'failureCount',
    'lastDurationMs',
    'createdAt',
  ]);
}

export function serializeScheduledTaskLog(value: unknown) {
  return pick(rawJson(value), [
    'id',
    'taskId',
    'status',
    'startedAt',
    'completedAt',
    'durationMs',
    'message',
    'error',
    'errorMessage',
    'createdAt',
  ]);
}
