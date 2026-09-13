import { readSnapshot } from '../investigation/incident-catalog';
import { appendAsService } from '../investigation/service-append';
import type { EventWriter } from '../investigation/event-writer';
import type { GithubCall } from '../production/github-client';
import { proposeMitigation } from '../experiments/mitigation-proposal';
import { flagText, incidentWithReproduction } from '../experiments/proof.fixture';
import type { Github } from './github-steps';
import { publishPullRequest } from './publish-pr';

const mitigation = { variant: 'off', restart: true, explanation: 'Turn the cache flag off', caveats: ['Cold cache'], notFixed: 'No size limit' };
const encoded = Buffer.from(flagText).toString('base64');

function fakeGithub(options: { branchExists: boolean; failPull: boolean }) {
  const calls: string[] = [];
  const bodies: unknown[] = [];
  const answer = (call: GithubCall): unknown => {
    const method = call.method ?? 'GET';
    calls.push(`${method} ${call.path.split('?')[0]}`);
    bodies.push(call.body);
    if (call.path.includes('/git/ref/heads/')) return { object: { sha: 'base-sha' } };
    if (method === 'POST' && call.path.endsWith('/git/refs') && options.branchExists) throw new Error('github POST /git/refs answered 422');
    if (method === 'GET' && call.path.includes('/contents/')) return { sha: 'file-sha', content: encoded };
    if (method === 'POST' && call.path.endsWith('/pulls') && options.failPull) throw new Error('github POST /pulls answered 502');
    if (method === 'POST' && call.path.endsWith('/pulls')) return { number: 7, html_url: 'https://github.com/Naaman-Saif/opentelemetry-demo/pull/7' };
    return { commit: { sha: 'commit-sha' } };
  };
  const github = (<Result>(call: GithubCall) => Promise.resolve().then(() => answer(call) as Result)) as Github;
  return { github, calls, bodies };
}

async function verifiedIncident(approved = true): Promise<{ writer: EventWriter; incidentId: string }> {
  const { writer, incidentId } = await incidentWithReproduction();
  const { mitigationId } = await proposeMitigation(writer, { incidentId, body: mitigation, flagText });
  const runIds = { verificationRunId: 'vr-1', mitigationId, contractId: 'contract-1' };
  const system = (type: string, payload: Record<string, unknown>) => ({ actor: 'system' as const, type: type as never, summary: type, refs: [], payload });
  const drafts = [system('verification_started', runIds)];
  for (const cycle of [1, 2, 3]) {
    drafts.push(system('cycle_started', { ...runIds, cycle, speed: 2 }));
    drafts.push(system('cycle_finished', { ...runIds, cycle, speed: 2, passed: true, checks: [{ name: 'mitigated.http_failures', passed: true, observed: 0 }] }));
  }
  drafts.push({ ...system('verification_reviewed', { ...runIds, approved, reasons: ['3 of 3 passed'] }), actor: 'verifier' as never });
  for (const draft of drafts) await appendAsService(writer, { incidentId, draft });
  return { writer, incidentId };
}

describe('publication', () => {
  it('opens one pull request after an approved 3 of 3 run and finishes the incident honestly', async () => {
    const { writer, incidentId } = await verifiedIncident();
    const { github, calls, bodies } = fakeGithub({ branchExists: false, failPull: false });
    expect(await publishPullRequest({ writer, github }, incidentId)).toBeNull();
    expect(calls.filter((call) => call.startsWith('PUT') || call.startsWith('POST'))).toHaveLength(3);
    const pull = bodies[calls.indexOf('POST /repos/Naaman-Saif/opentelemetry-demo/pulls')] as { body: string; base: string; head: string };
    expect(pull).toMatchObject({ base: 'nightcall-demo', head: 'nightcall/inc-001-mit-1' });
    expect(pull.body).toContain('+      "defaultVariant": "off",');
    expect(pull.body).toContain('3/3 verification cycles passed under the recorded conditions.');
    expect(pull.body).toContain('Round 3 (replayed at 2x speed): passed');
    const snapshot = readSnapshot(writer.stateDir, incidentId);
    expect(snapshot?.publication).toMatchObject({ state: 'published', number: 7, baseBranch: 'nightcall-demo' });
    expect(snapshot?.publication.diff).toContain('+      "defaultVariant": "off",');
    expect(snapshot?.incident).toMatchObject({ lifecycle: 'finished', completionReason: 'completed' });
    expect(snapshot?.runReport.notDone).toEqual(['Looking for the cause']);
    expect(snapshot?.runReport.did.map((step) => step.text)).toEqual(expect.arrayContaining(['Reproduced the crash in a test copy', 'Verified the fix', 'Opened a pull request']));
    expect(snapshot?.headline).toContain('Fix verified 3 of 3, replayed at 2x speed. PR #7 opened.');
    expect(await publishPullRequest({ writer, github }, incidentId)).toBe('the incident is completed');
  });

  it('refuses without an approval and records a failure the operator can retry', async () => {
    const unapproved = await verifiedIncident(false);
    const idle = fakeGithub({ branchExists: false, failPull: false });
    expect(await publishPullRequest({ writer: unapproved.writer, github: idle.github }, unapproved.incidentId)).toBe('no approved 3 of 3 verification run');
    expect(idle.calls).toEqual([]);
    const { writer, incidentId } = await verifiedIncident();
    await publishPullRequest({ writer, github: fakeGithub({ branchExists: false, failPull: true }).github }, incidentId);
    expect(readSnapshot(writer.stateDir, incidentId)?.publication).toMatchObject({ state: 'failed', failureReason: expect.stringContaining('502') });
    expect(await publishPullRequest({ writer, github: fakeGithub({ branchExists: true, failPull: false }).github }, incidentId)).toBeNull();
    expect(readSnapshot(writer.stateDir, incidentId)?.publication.state).toBe('published');
  });
});
