import type { PayloadOf } from './payload-schemas';

type Plain<Type> = Omit<Type, 'illustrative'>;

export type CheckResult = PayloadOf<'cycle_finished'>['checks'][number];

export type Contract = { id: string; checks: PayloadOf<'contract_recorded'>['checks'] };

export type ExperimentProgress = Omit<Plain<PayloadOf<'experiment_progress'>>, 'experimentId'>;

export type ExperimentReview = { accepted: boolean; reasons: string[]; reviewedAt: string };

export type Experiment = Omit<Plain<PayloadOf<'experiment_started'>>, 'experimentId' | 'trafficSource'> & {
  id: string;
  trafficSource: NonNullable<PayloadOf<'experiment_started'>['trafficSource']> | null;
  startedAt: string;
  finishedAt: string | null;
  progress: ExperimentProgress | null;
  verdict: PayloadOf<'experiment_finished'>['verdict'] | null;
  checks: CheckResult[];
  review: ExperimentReview | null;
  seriesRef: string | null;
};

export type Reproduction = 'untested' | 'testing' | 'confirmed' | 'not_reproduced' | 'inconclusive';

export type Mitigation = Omit<Plain<PayloadOf<'mitigation_proposed'>>, 'mitigationId'> & {
  id: string;
  status: 'proposed' | 'testing' | 'verified' | 'failed';
};

export type SupersededMitigation = { id: string; explanation: string; supersededAt: string };

export type VerificationRun = Plain<PayloadOf<'verification_started'>> & { startedAt: string };

export type Cycle = {
  number: number;
  state: 'pending' | 'running' | 'passed' | 'failed';
  checks: CheckResult[];
  verificationRunId: string;
  speed: number | null;
};

export type Verification = { verificationRunId: string; approved: boolean; reasons: string[] };

export type Publication = {
  state: 'not_eligible' | 'publishing' | 'published' | 'failed';
  repository: string | null;
  baseBranch: string | null;
  number: number | null;
  url: string | null;
  diff: string | null;
  failureReason: string | null;
};
