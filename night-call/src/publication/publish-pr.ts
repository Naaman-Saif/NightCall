import { settings } from '../config/settings';
import { runIsVerified } from '../investigation/current-run';
import { readLog } from '../investigation/event-lines';
import type { EventWriter } from '../investigation/event-writer';
import { incidentFolder } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';
import { appendAsService } from '../investigation/service-append';
import type { Snapshot } from '../investigation/snapshot';
import { CACHE_FLAG } from '../production/flag-release';
import { defaultVariantIn } from '../production/flag-text';
import { flagChangeOf } from './flag-diff';
import { ensureBranch, fileOnBranch, openPull, writeFlagFile, type Github, type PullRequest } from './github-steps';
import { prBodyOf } from './pr-body';
import { pullRequestAllowed, TEST_INCIDENT_NOTE } from './publish-label';

export type PublishDeps = { writer: EventWriter; github: Github };
type Publication = { state: 'publishing' | 'published' | 'failed' | 'not_eligible'; number: number | null; url: string | null; diff: string | null; failureReason: string | null };

export function publicationRefusal(snapshot: Snapshot, nowMs: number): string | null {
  if (snapshot.incident.lifecycle !== 'active') return `the incident is ${snapshot.incident.completionReason ?? 'finished'}`;
  if (Date.parse(snapshot.incident.deadlineAt) <= nowMs) return 'the time budget is used up';
  if (!runIsVerified(snapshot)) return 'no approved 3 of 3 verification run';
  if (!snapshot.mitigation?.variant) return 'the mitigation has no flag variant';
  const settled = snapshot.publication.state !== 'failed' && (snapshot.publication.state !== 'not_eligible' || snapshot.publication.repository !== null);
  return settled ? `publication is already ${snapshot.publication.state}` : null;
}

function append(deps: PublishDeps, request: { incidentId: string; summary: string; publication: Publication }) {
  const payload = { repository: settings.githubRepository, baseBranch: settings.demoBranch, ...request.publication };
  const draft = { actor: 'system' as const, type: 'publication_changed' as const, summary: request.summary, refs: [], payload };
  return appendAsService(deps.writer, { incidentId: request.incidentId, draft });
}

async function pushPull(deps: PublishDeps, snapshot: Snapshot): Promise<PullRequest & { diff: string }> {
  const { label } = snapshot.incident;
  const mitigation = snapshot.mitigation!;
  const variant = String(mitigation.variant);
  const branch = `nightcall/${label.toLowerCase()}-${mitigation.id}`;
  const baseText = (await fileOnBranch(deps.github, settings.demoBranch)).text;
  if (defaultVariantIn(baseText, CACHE_FLAG) === variant) throw new Error(`${settings.demoBranch} already has ${CACHE_FLAG} ${variant}, nothing to publish`);
  const change = flagChangeOf(baseText, variant);
  await ensureBranch(deps.github, branch);
  await writeFlagFile(deps.github, { branch, text: change.text, message: `fix: set recommendationCacheFailure to ${variant} (NightCall ${label})` });
  const body = prBodyOf(readLog(incidentFolder(deps.writer.stateDir, snapshot.incident.id)).events);
  const pull = await openPull(deps.github, { branch, title: `NightCall ${label}: set recommendationCacheFailure to ${variant}`, body });
  return { ...pull, diff: change.diff };
}

async function recordPublished(deps: PublishDeps, request: { incidentId: string; pull: PullRequest & { diff: string } }): Promise<void> {
  const { incidentId, pull } = request;
  const publication = { state: 'published' as const, number: pull.number, url: pull.url, diff: pull.diff, failureReason: null };
  await append(deps, { incidentId, summary: `Pull request #${pull.number} opened: ${pull.url}`, publication });
}

export async function publishPullRequest(deps: PublishDeps, incidentId: string): Promise<string | null> {
  const snapshot = requireSnapshot(deps.writer.stateDir, incidentId);
  const refusal = publicationRefusal(snapshot, Date.now());
  if (refusal) return refusal;
  const empty = { number: null, url: null, diff: null, failureReason: null };
  if (!pullRequestAllowed(deps.writer.stateDir, snapshot)) {
    await append(deps, { incidentId, summary: TEST_INCIDENT_NOTE, publication: { state: 'not_eligible', ...empty } });
    return TEST_INCIDENT_NOTE;
  }
  await append(deps, { incidentId, summary: `Opening a pull request against ${settings.demoBranch}`, publication: { state: 'publishing', ...empty } });
  try {
    await recordPublished(deps, { incidentId, pull: await pushPull(deps, snapshot) });
    return null;
  } catch (error) {
    const failureReason = String(error).slice(0, 1000);
    await append(deps, { incidentId, summary: `Pull request failed: ${failureReason}`.slice(0, 2000), publication: { state: 'failed', ...empty, failureReason } });
    return failureReason;
  }
}
