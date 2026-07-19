import { z } from 'zod';
import { toolError, toolSuccess } from '../../mcp-result.js';
import {
  serializeAiExecution,
  serializeAiExecutionDetail,
  serializeAiSettings,
  serializeEventLog,
  serializeScheduledTask,
  serializeScheduledTaskLog,
} from '../../serializers/insights.js';
import type { Capability } from '../types.js';

/**
 * Read-only audit/insight surface — AI execution history, workspace AI policy, the event log, and
 * scheduled-task history. Enabled only with a user token (a `platform` client). Nothing here
 * mutates: no execute/create/update/delete, and AI settings drop `secretRef`.
 */

const listExecutionsSchema = z.object({
  operationSlug: z.string().optional().describe('filter by operation slug, e.g. generate-summary'),
  status: z.string().optional().describe('filter by status, e.g. completed | failed'),
  entityId: z.string().optional().describe('filter to executions targeting one entity'),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

const idSchema = z.object({ id: z.string().min(1) });

const listEventsSchema = z.object({
  eventType: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

const entityHistorySchema = z.object({
  entityId: z.string().min(1),
  entityType: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const taskHistorySchema = z.object({
  idOrSlug: z.string().min(1).describe('scheduled task id or slug'),
  limit: z.number().int().positive().max(100).optional(),
});

export const insightsCapability: Capability = {
  id: 'insights',
  title: 'Insights',
  summary: 'Read AI execution history, workspace AI policy, the event log, and scheduled-task history.',
  register({ server, platform, logger }) {
    if (!platform) {
      logger.info('insights: no user token configured — audit/insight tools disabled (read-only mode).');
      return;
    }

    server.registerTool(
      'marvin_list_ai_executions',
      {
        title: 'List AI executions',
        description:
          'List AI operation runs (compose, generate-*, RAG, …) with tokens, cost, status, and target ' +
          'entity. Supports operationSlug / status / entityId filters. Read-only audit log.',
        inputSchema: listExecutionsSchema,
      },
      async (args) => {
        try {
          const executions = await platform.ai.executions.list(args);
          return toolSuccess(`Found ${executions.length} AI executions.`, {
            executions: executions.map(serializeAiExecution),
            count: executions.length,
          });
        } catch (error) {
          logger.warn('marvin_list_ai_executions failed', error);
          return toolError(error, 'Listing AI executions');
        }
      },
    );

    server.registerTool(
      'marvin_get_ai_execution',
      {
        title: 'Get AI execution',
        description: 'Get one AI execution by id, including its generated output (outputJson).',
        inputSchema: idSchema,
      },
      async ({ id }) => {
        try {
          const execution = serializeAiExecutionDetail(await platform.ai.executions.get(id));
          return toolSuccess(`AI execution ${id} loaded.`, { execution });
        } catch (error) {
          logger.warn('marvin_get_ai_execution failed', { id, error });
          return toolError(error, 'Getting AI execution');
        }
      },
    );

    server.registerTool(
      'marvin_get_ai_settings',
      {
        title: 'Get workspace AI settings',
        description:
          'Get the workspace AI policy — whether AI is enabled, the default provider/model, approval ' +
          'mode, and the invocation-source policy. Tells you what authoring the workspace allows. ' +
          'Never returns credentials.',
      },
      async () => {
        try {
          const settings = serializeAiSettings(await platform.ai.settings.get());
          return toolSuccess('Workspace AI settings loaded.', { settings });
        } catch (error) {
          logger.warn('marvin_get_ai_settings failed', error);
          return toolError(error, 'Getting workspace AI settings');
        }
      },
    );

    server.registerTool(
      'marvin_list_events',
      {
        title: 'List Marvin events',
        description:
          'List the workspace activity/event log (created/updated/published/AI runs, …). ' +
          'Supports eventType / entityType / entityId filters. Read-only.',
        inputSchema: listEventsSchema,
      },
      async (args) => {
        try {
          const events = await platform.eventLog.list({
            event_type: args.eventType,
            entity_type: args.entityType,
            entity_id: args.entityId,
            limit: args.limit,
            offset: args.offset,
          });
          return toolSuccess(`Found ${events.length} events.`, {
            events: events.map(serializeEventLog),
            count: events.length,
          });
        } catch (error) {
          logger.warn('marvin_list_events failed', error);
          return toolError(error, 'Listing Marvin events');
        }
      },
    );

    server.registerTool(
      'marvin_get_entity_history',
      {
        title: 'Get entity history',
        description: 'List the event history for one entity (by id) — every recorded change/AI run.',
        inputSchema: entityHistorySchema,
      },
      async ({ entityId, entityType, limit }) => {
        try {
          const events = await platform.eventLog.getEntityHistory(entityId, {
            entity_type: entityType,
            limit,
          });
          return toolSuccess(`Found ${events.length} events for entity ${entityId}.`, {
            events: events.map(serializeEventLog),
            count: events.length,
          });
        } catch (error) {
          logger.warn('marvin_get_entity_history failed', { entityId, error });
          return toolError(error, 'Getting entity history');
        }
      },
    );

    server.registerTool(
      'marvin_list_scheduled_tasks',
      {
        title: 'List scheduled tasks',
        description:
          'List the workspace scheduled tasks (schedule, task type, last run status). Read-only — ' +
          'does not create or execute tasks.',
      },
      async () => {
        try {
          const tasks = await platform.scheduledTasks.list();
          return toolSuccess(`Found ${tasks.length} scheduled tasks.`, {
            tasks: tasks.map(serializeScheduledTask),
            count: tasks.length,
          });
        } catch (error) {
          logger.warn('marvin_list_scheduled_tasks failed', error);
          return toolError(error, 'Listing scheduled tasks');
        }
      },
    );

    server.registerTool(
      'marvin_get_scheduled_task_history',
      {
        title: 'Get scheduled task history',
        description: 'List recent run history for one scheduled task (by id or slug). Read-only.',
        inputSchema: taskHistorySchema,
      },
      async ({ idOrSlug, limit }) => {
        try {
          const runs = await platform.scheduledTasks.history(idOrSlug, { limit });
          return toolSuccess(`Found ${runs.length} runs for task ${idOrSlug}.`, {
            runs: runs.map(serializeScheduledTaskLog),
            count: runs.length,
          });
        } catch (error) {
          logger.warn('marvin_get_scheduled_task_history failed', { idOrSlug, error });
          return toolError(error, 'Getting scheduled task history');
        }
      },
    );
  },
};
