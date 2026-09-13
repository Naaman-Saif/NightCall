export type Verdict = 'matches' | 'differs' | 'inconclusive' | 'failed';
export type CheckResult = { name: string; passed: boolean; observed: number | string | null };
export type ContractCheck = { name: string; comparator: 'gte' | 'lte' | 'eq'; value: number; unit: string };
export type RecipeChoice = 'incident_traffic' | 'fixed_fallback';
export type JobPoller = 'investigator' | 'verifier';

export type ExperimentRequest = {
  kind: 'reproduction' | 'mitigation';
  hypothesisId: string;
  purpose: string;
  recipe: RecipeChoice;
  flagVariant: 'on' | 'off';
  restart: boolean;
  speed: number;
};

export type JobResult = {
  state: 'running' | 'finished' | 'failed';
  verdict: Verdict | null;
  checks: CheckResult[];
  failureReason: string | null;
};

export type Started = { id: string; jobId: string };
export type ExperimentStarted = Started & { recipeSource: string };
export type MitigationProposal = { variant: 'off'; restart: boolean; explanation: string; caveats: string[]; notFixed: string };
export type Review = { id: string; accepted: boolean; reasons: string[] };

export type ProofApi = {
  recordContract(checks: ContractCheck[]): Promise<string>;
  startExperiment(request: ExperimentRequest): Promise<ExperimentStarted>;
  waitForJob(jobId: string, poller: JobPoller): Promise<JobResult>;
  reviewExperiment(review: Review): Promise<void>;
  proposeMitigation(proposal: MitigationProposal): Promise<string>;
  startVerification(ids: { mitigationId: string; contractId: string }): Promise<Started>;
  reviewVerification(review: Review): Promise<void>;
};
