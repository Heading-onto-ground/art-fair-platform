/**
 * Lightweight error logging for development and debugging.
 * Structured format for easier parsing and future log aggregation.
 *
 * In development: logs to console with [ArtistRitual] prefix.
 * In production: can be extended to send to a logging service.
 */

const PREFIX = "[ArtistRitual]";

type LogLevel = "error" | "warn" | "info" | "debug";

function formatPayload(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  return { timestamp, level, message, ...meta };
}

const g = typeof global !== "undefined" ? (global as unknown as { __DEV__?: boolean }) : null;
const isDev =
  (g && typeof g.__DEV__ === "boolean" && g.__DEV__) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV === "development");

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = formatPayload(level, message, meta);
  if (isDev) {
    const str = `${PREFIX} [${level.toUpperCase()}] ${message}`;
    if (meta && Object.keys(meta).length > 0) {
      console[level === "debug" ? "log" : level](str, meta);
    } else {
      console[level === "debug" ? "log" : level](str);
    }
  }
  return payload;
}

export const logger = {
  error: (message: string, meta?: Record<string, unknown>) =>
    log("error", message, meta),

  warn: (message: string, meta?: Record<string, unknown>) =>
    log("warn", message, meta),

  info: (message: string, meta?: Record<string, unknown>) =>
    log("info", message, meta),

  debug: (message: string, meta?: Record<string, unknown>) =>
    log("debug", message, meta),
};

/**
 * Log an error with optional context. Use for caught exceptions.
 */
export function logError(
  error: unknown,
  context?: string,
  meta?: Record<string, unknown>
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  return logger.error(context ? `${context}: ${message}` : message, {
    ...meta,
    stack,
    errorName: error instanceof Error ? error.name : undefined,
  });
}
