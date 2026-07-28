/**
 * Structured JSON logging.
 *
 * One line per event, machine-parseable, with a request id that follows work
 * from the web process into a job — which is the only practical way to debug
 * something slow that crosses a process boundary.
 *
 * Never log PII, tokens or full request bodies. For a platform holding people's
 * employment history that is a compliance matter, not a preference, so the
 * redactor below is applied to every field rather than left to call sites.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? LEVELS.info;

/** Field names whose values never appear in a log line, at any depth. */
const REDACT = [
  /token/i,
  /password/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /email/i,
  /phone/i,
  /\bip\b/i,
];

function redact(value: unknown, key = ""): unknown {
  if (REDACT.some((pattern) => pattern.test(key))) return "[redacted]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v, k)]),
    );
  }
  return value;
}

function emit(level: Level, event: string, fields: Record<string, unknown>) {
  if (LEVELS[level] < MIN_LEVEL) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(redact(fields) as Record<string, unknown>),
  };
  const out = level === "error" || level === "warn" ? console.error : console.log;
  out(JSON.stringify(line));
}

export const log = {
  debug: (event: string, fields: Record<string, unknown> = {}) => emit("debug", event, fields),
  info: (event: string, fields: Record<string, unknown> = {}) => emit("info", event, fields),
  warn: (event: string, fields: Record<string, unknown> = {}) => emit("warn", event, fields),
  error: (event: string, fields: Record<string, unknown> = {}) => emit("error", event, fields),
};
