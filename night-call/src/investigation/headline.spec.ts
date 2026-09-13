import { manualFacts } from '../incidents/manual-start.service';
import type { EventDraft, EventType } from './event-types';
import { readSnapshot } from './incident-catalog';
import { openInvestigation } from './open-investigation';
import { appendAsService } from './service-append';
import type { Snapshot } from './snapshot';
import { freshWriter, recommendationFacts } from './writer.fixture';

function system(type: EventType, payload: Record<string, unknown>): EventDraft {
  return { actor: 'system', type, summary: type, refs: [], payload };
}

async function incidentWith(drafts: EventDraft[], facts = recommendationFacts): Promise<Snapshot> {
  const writer = freshWriter();
  const opened = await openInvestigation(writer, { facts, blockDuplicates: false });
  const incidentId = String(opened?.incidentId);
  for (const draft of drafts) await appendAsService(writer, { incidentId, draft });
  return readSnapshot(writer.stateDir, incidentId) as Snapshot;
}

function crashEvidence(counts: { oom: number; die: number; start: number }): EventDraft {
  const crashCounts = { ...counts, since: '2026-09-13T16:36:00.000Z' };
  const evidence = { evidenceId: 'ev-oom', kind: 'oom_events', source: 'docker events', summary: 's', observedAt: 'now', excerpt: '' };
  return system('evidence_recorded', { ...evidence, crashCounts });
}

const started = system('investigation_started', { trigger: 'alert' });
const interrupted = system('investigation_finished', { reason: 'interrupted' });
const recipe = { flagVariant: 'on', restart: false, count: 50, pacingMs: 100, stopOnFailure: true };

function reproduction(accepted: boolean): EventDraft[] {
  const hypothesis = { hypothesisId: 'h1', claim: 'cache grows', supportingEvidenceIds: [], contradictingEvidenceIds: [], predicted: 'p' };
  const experiment = { experimentId: 'x1', kind: 'reproduction', hypothesisId: 'h1', contractId: 'c1', purpose: 'p', recipe };
  return [
    system('hypothesis_proposed', hypothesis),
    system('hypothesis_status_changed', { hypothesisId: 'h1', status: 'supported', reason: 'r' }),
    system('experiment_started', experiment),
    system('experiment_finished', { experimentId: 'x1', verdict: 'matches', checks: [], seriesRef: null }),
    system('experiment_reviewed', { experimentId: 'x1', accepted, reasons: [] }),
  ];
}

describe('fact headline', () => {
  it('states the alert, an unknown cause and that the investigation has not started', async () => {
    const snapshot = await incidentWith([]);
    expect(snapshot.headline).toMatch(
      /^Alert RecommendationRestarted fired for recommendation at \d{2}:\d{2} UTC\. The cause is not established\. Investigation has not started\.$/,
    );
  });

  it('states a manual start while the investigation runs', async () => {
    const snapshot = await incidentWith([started], manualFacts('recommendation'));
    expect(snapshot.headline).toMatch(/^An investigation of recommendation was started by hand at \d{2}:\d{2} UTC\. .* Investigation is running\.$/);
  });

  it('counts crashes from the recorded crash evidence and reports an interruption', async () => {
    const snapshot = await incidentWith([started, crashEvidence({ oom: 4, die: 4, start: 4 }), interrupted]);
    expect(snapshot.headline).toBe(
      'Recommendation ran out of memory and restarted 4 times since 16:36 UTC. The cause is not established. Investigation was interrupted before analysis completed.',
    );
  });

  it('keeps different stop and restart counts apart', async () => {
    const snapshot = await incidentWith([crashEvidence({ oom: 0, die: 2, start: 1 })]);
    expect(snapshot.headline.startsWith('Recommendation exited 2 times and restarted once since 16:36 UTC.')).toBe(true);
  });

  it('establishes the cause only when a supported hypothesis has an accepted matching reproduction', async () => {
    const finished = system('investigation_finished', { reason: 'completed' });
    const accepted = await incidentWith([started, ...reproduction(true), finished]);
    expect(accepted.headline).toMatch(/The cause is established by an accepted reproduction\. Investigation finished\.$/);
    const rejected = await incidentWith([started, ...reproduction(false)]);
    expect(rejected.headline).toMatch(/Most likely cause: cache grows, not yet reproduced\. Investigation is running\.$/);
  });
});
