import { z } from 'zod';
import { toolError, toolSuccess } from '../../mcp-result.js';
import { serializeForm, serializeFormSubmission, serializeFormSummary } from '../../serializers/form.js';
import type { Capability } from '../types.js';

/**
 * Read-only forms surface — list forms and read their submissions. Enabled only with a user token.
 * Pairs with the `classify_form_submission` AI operation. No create/update/delete/submit.
 */

const idSchema = z.object({ id: z.string().min(1) });

const submissionsSchema = z.object({
  formId: z.string().min(1).describe('form id'),
});

export const formsCapability: Capability = {
  id: 'forms',
  title: 'Forms',
  summary: 'List Marvin forms and read their submissions (read-only).',
  register({ server, platform, logger }) {
    if (!platform) {
      logger.info('forms: no user token configured — forms tools disabled (read-only mode).');
      return;
    }

    server.registerTool(
      'marvin_list_forms',
      {
        title: 'List Marvin forms',
        description: 'List the workspace forms (name, slug, status). Read-only.',
      },
      async () => {
        try {
          const forms = await platform.forms.list();
          return toolSuccess(`Found ${forms.length} forms.`, {
            forms: forms.map(serializeFormSummary),
            count: forms.length,
          });
        } catch (error) {
          logger.warn('marvin_list_forms failed', error);
          return toolError(error, 'Listing Marvin forms');
        }
      },
    );

    server.registerTool(
      'marvin_get_form',
      {
        title: 'Get Marvin form',
        description: 'Get one form by id, including its field schema (schemaJson).',
        inputSchema: idSchema,
      },
      async ({ id }) => {
        try {
          const form = serializeForm(await platform.forms.get(id));
          return toolSuccess(`Form ${id} loaded.`, { form });
        } catch (error) {
          logger.warn('marvin_get_form failed', { id, error });
          return toolError(error, 'Getting Marvin form');
        }
      },
    );

    server.registerTool(
      'marvin_get_form_submissions',
      {
        title: 'Get form submissions',
        description:
          'List submissions for one form (by id). Useful before classifying them with the ' +
          'classify_form_submission operation. Read-only.',
        inputSchema: submissionsSchema,
      },
      async ({ formId }) => {
        try {
          const submissions = await platform.forms.getSubmissions(formId);
          return toolSuccess(`Found ${submissions.length} submissions for form ${formId}.`, {
            submissions: submissions.map(serializeFormSubmission),
            count: submissions.length,
          });
        } catch (error) {
          logger.warn('marvin_get_form_submissions failed', { formId, error });
          return toolError(error, 'Getting form submissions');
        }
      },
    );
  },
};
