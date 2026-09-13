import { ConflictException } from '@nestjs/common';

import { proposeMitigation } from '../experiments/mitigation-proposal';
import { flagText, incidentWithReproduction } from '../experiments/proof.fixture';
import type { EventWriter } from '../investigation/event-writer';
import { readSnapshot } from '../investigation/incident-catalog';
import { appendAsRole } from '../investigation/role-append';
import { stopBody } from '../investigation/run.fixture';
import { appendAsService } from '../investigation/service-append';
import type { GithubCall } from '../production/github-client';
import type { Github } from './github-steps';
import { retryPullRequest } from './publish-pr';

const encoded = Buffer.from(flagText).toString('base64');
const publication = { repository: 'Naaman-Saif/opentelemetry-demo', baseBranch: 'nightcall-demo', number: null, url: null, diff: null, failureReason: null };

function system(type: string, payload: Record<string, unknown>) {
  return { actor: 'system' as const, type: type as never, summary: type, refs: [], payload };
}

async function stuckPublishing(): Promise<{ writer: EventWriter; incidentId: string }> {
  const { writer, incidentId } = await incidentWithReproduction();
  const { mitigationId } = await proposeMitigation(writer, { incidentId, body: { variant: 'off', explanation: 'flag off', notFixed: 'no limit' }, flagText });
  const runIds = { verificationRunId: 'vr-1', mitigationId, contractId: 'contract-1' };
  const drafts = [system('verification_started', runIds)];
  for (const cycle of [1, 2, 3]) drafts.push(system('cycle_started', { ...runIds, cycle }), system('cycle_finished', { ...runIds, cycle, passed: true, checks: [] }));
  drafts.push({ ...system('verification_reviewed', { ...runIds, approved: true, reasons: ['3 of 3'] }), actor: 'verifier' as never });
  drafts.push(system('publication_changed', { ...publication, state: 'publishing' }));
  for (const draft of drafts) await appendAsService(writer, { incidentId, draft });
  await appendAsRole(writer, { role: 'lead', incidentId, body: stopBody('answer_recorded') });
  return { writer, incidentId };
}

function githubWithOpenPull(): { github: Github; calls: string[] } {
  const calls: string[] = [];
  const answer = (call: GithubCall): unknown => {
    calls.push(`${call.method ?? 'GET'} ${call.path.split('?')[0]}`);
    if (call.path.includes('/pulls?state=open')) return [{ number: 2, html_url: 'https://github.com/Naaman-Saif/opentelemetry-demo/pull/2' }];
    return { sha: 'file-sha', content: encoded };
  };
  const github = (<Result>(call: GithubCall) => Promise.resolve().then(() => answer(call) as Result)) as Github;
  return { github, calls };
}

describe('publication after the incident finished', () => {
  it('accepts a system published or failed record, and nothing else', async () => {
    const { writer, incidentId } = await stuckPublishing();
    await appendAsService(writer, { incidentId, draft: system('publication_changed', { ...publication, state: 'failed', failureReason: 'github down' }) });
    const late = [system('publication_changed', { ...publication, state: 'publishing' }), system('experiment_progress', { experimentId: 'exp-1', requests: 1, errors: 0, peakMemoryBytes: 1, peakCpuPercent: 1 })];
    for (const draft of late) await expect(appendAsService(writer, { incidentId, draft })).rejects.toBeInstanceOf(ConflictException);
    expect(readSnapshot(writer.stateDir, incidentId)?.publication.state).toBe('failed');
  });

  it('records an open pull request for the branch on retry without creating anything', async () => {
    const { writer, incidentId } = await stuckPublishing();
    const { github, calls } = githubWithOpenPull();
    expect(await retryPullRequest({ writer, github }, incidentId)).toBeNull();
    expect(calls.filter((call) => !call.startsWith('GET'))).toEqual([]);
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.publication).toMatchObject({ state: 'published', number: 2, url: 'https://github.com/Naaman-Saif/opentelemetry-demo/pull/2' });
    expect(snapshot?.incident.lifecycle).toBe('finished');
    expect(await retryPullRequest({ writer, github }, incidentId)).toBe('publication is published, nothing to retry');
  });
});
