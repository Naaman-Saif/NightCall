import type { Snapshot } from '../api/contract';
import { FixSummary, PullRequestSummary, VerificationSummary } from './proof-fix';
import { ReproductionSummary } from './proof-reproduction';

export function ProofSummary({ snapshot }: { snapshot: Snapshot }) {
  return (
    <>
      <ReproductionSummary snapshot={snapshot} />
      <FixSummary snapshot={snapshot} />
      <VerificationSummary snapshot={snapshot} />
      <PullRequestSummary snapshot={snapshot} />
    </>
  );
}
