import type { Snapshot } from '../api/contract';
import { FixSummary, PullRequestSummary, VerificationSummary } from './proof-fix';
import { ReproductionSummary } from './proof-reproduction';

export function ProofSummary({ snapshot }: { snapshot: Snapshot }) {
  return (
    <>
      <ReproductionSummary snapshot={snapshot} />
      <FixSummary mitigation={snapshot.mitigation} />
      <VerificationSummary snapshot={snapshot} />
      <PullRequestSummary publication={snapshot.publication} />
    </>
  );
}
