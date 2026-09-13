import { settings } from '../config/settings';
import { readLog } from '../investigation/event-lines';
import type { EventWriter } from '../investigation/event-writer';
import { incidentFolder } from '../investigation/incident-paths';
import { requireSnapshot } from '../investigation/require-snapshot';
import { appendAsService } from '../investigation/service-append';
import type { Snapshot } from '../investigation/snapshot';
import { CACHE_FLAG } from '../production/flag-release';
import { defaultVariantIn } from '../production/flag-text';
import { flagChangeOf } from './flag-diff';
import { ensureBranch, fileOnBranch, findOpenPull, openPull, writeFlagFile, type Github, type PullRequest } from './github-steps';
import { publicationRefusal, retryRefusal } from './publication-refusal';
import { prBodyOf } from './pr-body';
import { pullRequestAllowed, TEST_INCIDENT_NOTE } from './publish-label';

export { publicationRefusal } from './publication-refusal';

export type PublishDeps = { writer: EventWriter; github: Github };
type Publication = { state: 'publishing' | 'published' | 'failed' | 'not_eligible'; number: number | null; url: string | null; diff: string | null; failureReason: string | null };

const EMPTY = { number: null, url: null, diff: null, failureReason: null };

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
  const existing = await findOpenPull(deps.github, branch);
  if (existing) return { ...existing, diff: change.diff };
  await ensureBranch(deps.github, branch);
  await writeFlagFile(deps.github, { branch, text: change.text, message: `fix: set recommendationCacheFailure to ${variant} (NightCall ${label})` });
  const body = prBodyOf(readLog(incidentFolder(deps.writer.stateDir, snapshot.incident.id)).events);
  const pull = await openPull(deps.github, { branch, title: `NightCall ${label}: set recommendationCacheFailure to ${variant}`, body });
  return { ...pull, diff: change.diff };
}

async function recordOutcome(deps: PublishDeps, snapshot: Snapshot): Promise<string | null> {
  const incidentId = snapshot.incident.id;
  try {
    const pull = await pushPull(deps, snapshot);
    const publication = { state: 'published' as const, number: pull.number, url: pull.url, diff: pull.diff, failureReason: null };
    await append(deps, { incidentId, summary: `Pull request #${pull.number} opened: ${pull.url}`, publication });
    return null;
  } catch (error) {
    const failureReason = String(error).slice(0, 1000);
    await append(deps, { incidentId, summary: `Pull request failed: ${failureReason}`.slice(0, 2000), publication: { state: 'failed', ...EMPTY, failureReason } });
    return failureReason;
  }
}

export async function publishPullRequest(deps: PublishDeps, incidentId: string): Promise<string | null> {
  const snapshot = requireSnapshot(deps.writer.stateDir, incidentId);
  const refusal = publicationRefusal(snapshot, Date.now());
  if (refusal) return refusal;
  if (!pullRequestAllowed(deps.writer.stateDir, snapshot)) {
    await append(deps, { incidentId, summary: TEST_INCIDENT_NOTE, publication: { state: 'not_eligible', ...EMPTY } });
    return TEST_INCIDENT_NOTE;
  }
  await append(deps, { incidentId, summary: `Opening a pull request against ${settings.demoBranch}`, publication: { state: 'publishing', ...EMPTY } });
  return recordOutcome(deps, snapshot);
}

export async function retryPullRequest(deps: PublishDeps, incidentId: string): Promise<string | null> {
  const snapshot = requireSnapshot(deps.writer.stateDir, incidentId);
  const refusal = retryRefusal(snapshot);
  if (refusal) return refusal;
  if (!pullRequestAllowed(deps.writer.stateDir, snapshot)) return TEST_INCIDENT_NOTE;
  return recordOutcome(deps, snapshot);
}
