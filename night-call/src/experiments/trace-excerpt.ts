import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Tag = { key: string; value: unknown };
type Span = { operationName?: string; processID?: string; tags?: Tag[] };
type Trace = { spans?: Span[]; processes?: Record<string, { serviceName?: string }> };
type TraceFile = { failedRequests?: number; failedWithTrace?: number; traces?: Trace[] };

export type TraceLocation = { runFolder: string; stage: string };

const MAX_LINES = 5;

function tagValue(span: Span, key: string): unknown {
  return span.tags?.find((tag) => tag.key === key)?.value;
}

function spanFailed(span: Span): boolean {
  return tagValue(span, 'error') === true || tagValue(span, 'otel.status_code') === 'ERROR';
}

function failureLines(trace: Trace): string[] {
  return (trace.spans ?? []).filter(spanFailed).map((span) => {
    const service = trace.processes?.[span.processID ?? '']?.serviceName ?? 'unknown service';
    const reason = tagValue(span, 'otel.status_description') ?? tagValue(span, 'rpc.grpc.status_code') ?? tagValue(span, 'http.status_code');
    return `${service} ${span.operationName ?? 'span'} failed${reason === undefined ? '' : `: ${String(reason).slice(0, 200)}`}`;
  });
}

export function traceExcerpt(location: TraceLocation): string | null {
  const path = join(location.runFolder, 'evidence', location.stage, 'traces.json');
  if (!existsSync(path)) return null;
  try {
    const file = JSON.parse(readFileSync(path, 'utf8')) as TraceFile;
    const lines = (file.traces ?? []).flatMap(failureLines).slice(0, MAX_LINES);
    return [`${file.failedWithTrace ?? 0} of ${file.failedRequests ?? 0} failed requests have a trace.`, ...lines].join('\n');
  } catch {
    return null;
  }
}
