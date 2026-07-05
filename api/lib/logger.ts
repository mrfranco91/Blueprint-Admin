/**
 * Structured logging for Blueprint-Pro server endpoints.
 *
 * Logs JSON-structured entries with event type, timestamp, and context.
 * NEVER logs sensitive data (tokens, secrets, passwords, raw activation tokens).
 */

interface LogEntry {
  event: string;
  timestamp: string;
  [key: string]: any;
}

const SENSITIVE_KEYS = new Set([
  'token', 'access_token', 'refresh_token', 'password',
  'authorization', 'square_access_token', 'service_role_key',
  'anon_key', 'raw_token', 'activation_token',
]);

function sanitize(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      out[key] = sanitize(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function log(event: string, data?: Record<string, any>): void {
  const entry: LogEntry = {
    event,
    timestamp: new Date().toISOString(),
    ...(data ? sanitize(data) : {}),
  };
  console.log(JSON.stringify(entry));
}
