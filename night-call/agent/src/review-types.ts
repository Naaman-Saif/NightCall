import type { CheckResult, ContractCheck, Verdict } from './proof-types.js';

export type ReviewKind = 'reproduction' | 'verification';

export type ReviewRequest = {
  kind: ReviewKind;
  cause: string;
  contract: ContractCheck[];
  checks: CheckResult[];
  verdict: Verdict | null;
  evidence: string;
};

export type ModelReview = { accepted: boolean; reasons: string[] };

export type Reviewer = { review(request: ReviewRequest): Promise<ModelReview> };
