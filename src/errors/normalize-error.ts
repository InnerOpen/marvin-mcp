import { ConfigurationError } from '../config.js';
import { MarvinObjectNotFoundError, type NormalizedError } from './types.js';

export function normalizeError(error: unknown, context: string): NormalizedError {
  if (error instanceof ConfigurationError) {
    return {
      code: 'configuration_error',
      message: error.message,
      suggestion: 'Set MARVIN_API_URL, MARVIN_SITE_CLIENT_TOKEN, and MARVIN_WORKSPACE_SLUG.',
    };
  }

  if (error instanceof MarvinObjectNotFoundError) {
    return {
      code: 'not_found',
      message: `${context} could not find ${error.kind} "${error.slug}".`,
      suggestion: 'Verify the Marvin slug and workspace configuration.',
      status: 404,
    };
  }

  const status = readStatus(error);
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = redactMessage(rawMessage);

  if (status === 401 || /unauthorized|authentication/i.test(message)) {
    return {
      code: 'authentication_failed',
      message: `${context} failed because Marvin rejected the credentials.`,
      suggestion: 'Check that MARVIN_SITE_CLIENT_TOKEN is a valid site client token.',
      status,
    };
  }

  if (status === 403 || /forbidden|authorization/i.test(message)) {
    return {
      code: 'authorization_failed',
      message: `${context} failed because the token is not authorized for this workspace.`,
      suggestion: 'Use a token with access to MARVIN_WORKSPACE_SLUG.',
      status,
    };
  }

  if (status === 404 || /not found|NOT_FOUND/i.test(message) || readCode(error) === 'NOT_FOUND') {
    return {
      code: /workspace/i.test(message) ? 'workspace_not_found' : 'not_found',
      message: `${context} could not find the requested Marvin object.`,
      suggestion: 'Verify the workspace slug and requested Marvin slug.',
      status,
    };
  }

  if (status === 400 || /validation|required|invalid/i.test(message)) {
    return {
      code: 'validation_error',
      message: `${context} received invalid input or configuration.`,
      suggestion: 'Check the tool arguments and Marvin environment variables.',
      status,
    };
  }

  if (/timeout|aborted|NETWORK_ERROR/i.test(message) || readCode(error) === 'NETWORK_ERROR') {
    return {
      code: 'timeout',
      message: `${context} timed out while contacting Marvin.`,
      suggestion: 'Retry later or check Marvin API availability.',
      status,
    };
  }

  if (status && status >= 500) {
    return {
      code: 'marvin_unavailable',
      message: `${context} failed because Marvin API returned ${status}.`,
      suggestion: 'Retry later or check Marvin API status.',
      status,
    };
  }

  return {
    code: 'unexpected_response',
    message: `${context} failed unexpectedly.`,
    suggestion: 'Check server logs and verify the Marvin SDK/API response shape.',
    status,
  };
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.status === 'number') return record.status;
  if (typeof record.statusCode === 'number') return record.statusCode;
  if (record.response && typeof record.response === 'object') {
    const response = record.response as Record<string, unknown>;
    if (typeof response.status === 'number') return response.status;
  }
  return undefined;
}

function readCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : undefined;
}

function redactMessage(message: string): string {
  return message
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [REDACTED]')
    .replace(/token["'\s:=]+[\w.-]+/gi, 'token=[REDACTED]');
}
