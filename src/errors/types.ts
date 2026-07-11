export type MarvinMcpErrorCode =
  | 'configuration_error'
  | 'authentication_failed'
  | 'authorization_failed'
  | 'workspace_not_found'
  | 'not_found'
  | 'validation_error'
  | 'marvin_unavailable'
  | 'timeout'
  | 'unexpected_response';

export interface NormalizedError {
  code: MarvinMcpErrorCode;
  message: string;
  suggestion: string;
  status?: number;
}

export class MarvinObjectNotFoundError extends Error {
  readonly status = 404;

  constructor(
    readonly kind: string,
    readonly slug: string,
  ) {
    super(`${kind} not found: ${slug}`);
    this.name = 'MarvinObjectNotFoundError';
  }
}
