import { urlFor } from '../config/hosts';
import type { StackTarget } from '../config/targets';

const lookbackMs = 5 * 60 * 1000;
const traceLimit = 20;

interface JaegerTag { key: string; value: unknown }
interface JaegerLog { fields: JaegerTag[] }
interface JaegerSpan { operationName: string; duration: number; tags: JaegerTag[]; logs: JaegerLog[] }
interface JaegerTrace { traceID: string; spans: JaegerSpan[] }

export interface ErrorSpan {
  traceId: string;
  operation: string;
  durationMs: number;
  message: string;
}

function tagValue(tags: JaegerTag[], key: string): string {
  return String(tags.find((tag) => tag.key === key)?.value ?? '');
}

function spanHasError(span: JaegerSpan): boolean {
  return tagValue(span.tags, 'error') === 'true' || tagValue(span.tags, 'otel.status_code') === 'ERROR';
}

function messageOf(span: JaegerSpan): string {
  const fromLogs = span.logs.flatMap((log) => log.fields).find((f) => f.key === 'exception.message' || f.key === 'message');
  return tagValue(span.tags, 'otel.status_description') || String(fromLogs?.value ?? '');
}

export function summarizeErrorSpans(traces: JaegerTrace[]): ErrorSpan[] {
  return traces.flatMap((trace) =>
    trace.spans.filter(spanHasError).map((span) => ({
      traceId: trace.traceID,
      operation: span.operationName,
      durationMs: Math.round(span.duration / 1000),
      message: messageOf(span),
    })),
  );
}

export async function errorSpans(target: StackTarget, service: string): Promise<ErrorSpan[]> {
  const end = Date.now() * 1000;
  const start = end - lookbackMs * 1000;
  const tags = encodeURIComponent(JSON.stringify({ error: 'true' }));
  const url = `${await urlFor(target, 'jaeger')}/jaeger/ui/api/traces?service=${service}&tags=${tags}&start=${start}&end=${end}&limit=${traceLimit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`jaeger ${response.status} for ${service}`);
  const body = (await response.json()) as { data: JaegerTrace[] };
  return summarizeErrorSpans(body.data ?? []);
}
