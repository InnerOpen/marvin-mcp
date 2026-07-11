import type { MarvinMcpConfig } from './config.js';

const levels = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
} as const;

type LogLevel = keyof typeof levels;

export interface Logger {
  error(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  info(message: string, details?: unknown): void;
  debug(message: string, details?: unknown): void;
}

export function createLogger(config: Pick<MarvinMcpConfig, 'logLevel'>): Logger {
  const threshold = levels[config.logLevel as LogLevel] ?? levels.warn;

  function log(level: Exclude<LogLevel, 'silent'>, message: string, details?: unknown) {
    if (levels[level] > threshold) return;
    const suffix = details === undefined ? '' : ` ${JSON.stringify(redact(details))}`;
    process.stderr.write(`[marvin-mcp] ${level}: ${message}${suffix}\n`);
  }

  return {
    error: (message, details) => log('error', message, details),
    warn: (message, details) => log('warn', message, details),
    info: (message, details) => log('info', message, details),
    debug: (message, details) => log('debug', message, details),
  };
}

export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/(token|authorization|bearer)\s*[:=]\s*[\w.-]+/gi, '$1=[REDACTED]');
  }
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      /token|authorization|secret|password/i.test(key) ? '[REDACTED]' : redact(item),
    ]),
  );
}
