import type { CheckedCause } from './cause-rules.js';
import { acceptedReproductions } from './proof-record.js';
import type { MitigationProposal } from './proof-types.js';
import { withoutEndMark } from './report-lines.js';
import { runStep, type RunContext } from './run-steps.js';

const SKIP_LABEL = 'proposing the mitigation';

export function mitigationProposal(cause: CheckedCause | null): MitigationProposal {
  const because = cause ? `, because the reproduced cause is: ${withoutEndMark(cause.claim)}` : '';
  return {
    variant: 'off',
    restart: true,
    explanation: `Set the recommendationCacheFailure flag to its existing off variant and restart the recommendation service${because}.`,
    caveats: ['This turns the cache path off instead of repairing it.', 'It is checked against traffic replayed in a test copy, not every production load.'],
    notFixed: 'Not fixed: the code behind the cache growth is unchanged, so turning the flag on again brings the failure back.',
  };
}

export async function proposeMitigation(context: RunContext, causes: CheckedCause[]): Promise<void> {
  const reproduced = acceptedReproductions(context.record)[0];
  if (!reproduced) {
    context.run.skipped.push(`${SKIP_LABEL} (no reproduction was accepted)`);
    return;
  }
  const cause = causes.find((candidate) => candidate.hypothesisId === reproduced.hypothesisId) ?? null;
  const nowDoing = 'Proposing the safest mitigation: the existing off setting of the cache flag, plus a restart';
  const work = () => context.proof.proposeMitigation(mitigationProposal(cause));
  context.record.mitigationId = await runStep(context, { nowDoing, skipLabel: SKIP_LABEL, work });
}
