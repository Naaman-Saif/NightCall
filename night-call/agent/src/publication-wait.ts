import { setTimeout as sleep } from 'node:timers/promises';

import type { PublicationFacts } from './proof-types.js';
import { NotReady, runStep, type RunContext } from './run-steps.js';

export const PUBLICATION_BY_MINUTE = 24;
const POLL_PAUSE_MS = 10_000;

export function isTestIncident(publication: PublicationFacts | null): boolean {
  return /test incident/i.test(publication?.failureReason ?? '');
}

export function publicationIsFinal(publication: PublicationFacts | null): publication is PublicationFacts {
  if (publication === null) return false;
  if (publication.state === 'published') return publication.url !== null;
  return publication.state === 'failed' || isTestIncident(publication);
}

async function pollPublication(context: RunContext, until: number): Promise<PublicationFacts> {
  const publication = await context.proof.readPublication();
  if (publicationIsFinal(publication)) return publication;
  if (context.run.now() >= until) throw new NotReady(`minute ${PUBLICATION_BY_MINUTE} was reached`);
  await sleep(POLL_PAUSE_MS);
  return pollPublication(context, until);
}

export async function waitForPublication(context: RunContext): Promise<void> {
  if (!context.record.verification?.approved) return;
  const until = Math.min(context.run.deadline, context.run.openedAt + PUBLICATION_BY_MINUTE * 60_000);
  const work = () => pollPublication(context, until);
  const nowDoing = 'Waiting for NightCall to open the pull request';
  context.record.publication = await runStep(context, { nowDoing, skipLabel: 'waiting for the pull request', work });
}
