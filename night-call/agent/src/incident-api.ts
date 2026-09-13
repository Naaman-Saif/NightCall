import type { ProgressEvent } from './progress.js';
import type { ToolClient } from './tool-client.js';

export type ReaderName = 'failure-rate' | 'memory' | 'cpu' | 'oom-events' | 'logs' | 'traces' | 'deploy-history' | 'flag-state';

export type ReaderQuery = Record<string, string | number>;

export type EvidenceView = { evidenceId: string; kind: string; summary: string; excerpt: string };

export type ReaderReply = { evidence: EvidenceView; data: unknown };

export type Answer = { questionId: string | null; text: string; suppliedAt: string };

export type IncidentApi = {
  read(reader: ReaderName, query: ReaderQuery): Promise<ReaderReply>;
  postEvent(event: ProgressEvent): Promise<unknown>;
  waitForAnswers(waitSeconds: number): Promise<Answer[]>;
  readCase(): Promise<Record<string, unknown>>;
};

type EventLike = { payload?: Partial<EvidenceView> };

function queryText(query: ReaderQuery): string {
  const pairs = Object.entries(query).map(([key, value]): [string, string] => [key, String(value)]);
  return pairs.length === 0 ? '' : `?${new URLSearchParams(pairs).toString()}`;
}

function readerReplyOf(raw: unknown): ReaderReply {
  const reply = raw as { evidence?: EventLike; data?: unknown };
  const payload = reply.evidence?.payload ?? {};
  const evidence = { evidenceId: payload.evidenceId ?? '', kind: payload.kind ?? '', summary: payload.summary ?? '', excerpt: payload.excerpt ?? '' };
  return { evidence, data: reply.data };
}

export function answersOf(raw: unknown): Answer[] {
  const reply = raw as { answers?: unknown; context?: unknown } | unknown[];
  const list = Array.isArray(reply) ? reply : (reply?.answers ?? reply?.context ?? []);
  return Array.isArray(list) ? (list as Answer[]).filter((answer) => typeof answer?.text === 'string') : [];
}

export function incidentApiFor(client: ToolClient, incidentId: string): IncidentApi {
  const base = `/tool/incidents/${encodeURIComponent(incidentId)}`;
  return {
    read: async (reader, query) => readerReplyOf(await client.get(`${base}/prod/${reader}${queryText(query)}`)),
    postEvent: (event) => client.post(`${base}/events`, { refs: [], ...event }),
    waitForAnswers: async (waitSeconds) => answersOf(await client.get(`${base}/context?waitSeconds=${waitSeconds}`)),
    readCase: async () => (await client.get(`${base}/case`)) as Record<string, unknown>,
  };
}
