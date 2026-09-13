import type { EventDraft, EventType } from './event-types';
import type { EventWriter } from './event-writer';
import { readSnapshot } from './incident-catalog';
import { supplyContext } from './operator-context';
import { appendAsRole } from './role-append';
import { appendAsService } from './service-append';
import type { Snapshot } from './snapshot';
import { freshWriter, impactQuestion, openIncident, toolBody } from './writer.fixture';

export type RecordedRun = { writer: EventWriter; incidentId: string; startedAt: string };

export const RATE_SUMMARY = 'Recommendation requests failing: 0.00% over the last 10 minutes';
export const MEMORY_SUMMARY = 'recommendation memory latest 96 MiB, peak 200 MiB, limit 500 MiB (49 samples over 15 minutes)';
export const DEPLOY_SUMMARY = 'No changes to src/flagd/demo.flagd.json on Naaman-Saif/opentelemetry-demo@nightcall-demo';

export function system(type: EventType, payload: Record<string, unknown>): EventDraft {
  return { actor: 'system', type, summary: type, refs: [], payload };
}

function reading(fields: Record<string, unknown>): EventDraft {
  return system('evidence_recorded', { observedAt: 'now', excerpt: '', ...fields });
}

export const failureRate = reading({ evidenceId: 'ev-rate', kind: 'logs', source: 'span metrics and canary: recommendation', summary: RATE_SUMMARY, value: '0.00% over 10 min' });
export const memory = reading({ evidenceId: 'ev-memory', kind: 'memory', source: 'recorder: recommendation', summary: MEMORY_SUMMARY, value: 'latest 96 MiB, peak 200 MiB in 15 min' });
export const deploy = reading({ evidenceId: 'ev-deploy', kind: 'deploy_history', source: 'github: demo', summary: DEPLOY_SUMMARY, value: 'no changes' });

export function crashSummary(count: number): string {
  return `${count} out-of-memory events, ${count} exits and ${count} starts for recommendation in the last 10 minutes`;
}

export function crashReading(evidenceId: string, crash: { count: number; since: string }): EventDraft {
  const crashCounts = { oom: crash.count, die: crash.count, start: crash.count, since: crash.since };
  const value = `${crash.count} out-of-memory kills, ${crash.count} restarts in 10 min`;
  return reading({ evidenceId, kind: 'oom_events', source: 'docker events: recommendation', summary: crashSummary(crash.count), value, crashCounts });
}

export async function recordedRun(readings: EventDraft[]): Promise<RecordedRun> {
  const writer = freshWriter();
  const incidentId = await openIncident(writer);
  const started = await appendAsService(writer, { incidentId, draft: system('investigation_started', { trigger: 'manual' }) });
  for (const draft of readings) await appendAsService(writer, { incidentId, draft });
  await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('question_asked', impactQuestion) });
  await supplyContext(writer, { incidentId, body: { questionId: 'q-impact', text: 'Tolerable', idempotencyKey: 'k1' } });
  return { writer, incidentId, startedAt: started.occurredAt };
}

export function stopBody(reason: string, refs: string[] = []): Record<string, unknown> {
  const summary = 'Read the signals and recorded the answer';
  return { type: 'investigation_stopped', summary, refs, payload: { reason, nextStepsAvailable: false, summary } };
}

export function leadStatus(status: string): Record<string, unknown> {
  return toolBody('role_status_changed', { role: 'lead', status, assignment: `Lead ${status}` });
}

export function snapshotOf(writer: EventWriter, incidentId: string): Snapshot {
  return readSnapshot(writer.stateDir, incidentId) as Snapshot;
}
