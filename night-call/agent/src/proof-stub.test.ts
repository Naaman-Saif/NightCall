import type { CheckResult, JobResult, ProofApi, PublicationFacts, Verdict } from './proof-types.js';
import { ToolAnswerError } from './tool-client.js';

export type ProofOptions = {
  proof?: 'passing' | 'unavailable';
  verdict?: Verdict;
  verificationVerdict?: Verdict;
  recipeMissing?: boolean;
  stuckExperiment?: () => void;
  publication?: PublicationFacts;
  publications?: PublicationFacts[];
  failedPublicationReads?: number;
  onPublicationRead?: () => void;
};

export const OPENED_PULL_REQUEST: PublicationFacts = { state: 'published', url: 'https://github.com/NaamanSaif/nightcall-demo/pull/7', failureReason: null };

const STILL_RUNNING: JobResult = { state: 'running', verdict: null, checks: [], failureReason: null };

type Steps = { steps: string[] };

const FAULT_CHECKS: CheckResult[] = [
  { name: 'fault.oom_kills', passed: true, observed: 3 },
  { name: 'fault.http_failures', passed: true, observed: 12 },
];

const MITIGATED_CHECKS: CheckResult[] = [
  { name: 'mitigated.http_failures', passed: true, observed: 0 },
  { name: 'mitigated.restarts', passed: true, observed: 0 },
];

const refusal = (status: number, code: string) => new ToolAnswerError(status, JSON.stringify({ code }));

function experimentStart(recorded: Steps, options: ProofOptions): ProofApi['startExperiment'] {
  let starts = 0;
  return async (request) => {
    recorded.steps.push(`proof experiment ${request.hypothesisId} ${request.recipe} flag ${request.flagVariant} speed ${request.speed}`);
    if (options.recipeMissing && request.recipe === 'incident_traffic') throw refusal(422, 'recipe_missing');
    starts += 1;
    return { id: `exp-${starts}`, jobId: `job-experiment-${starts}`, recipeSource: request.recipe === 'fixed_fallback' ? 'fixed_fallback' : 'traces', estimatedMinutes: 6 };
  };
}

function finished(verdict: Verdict, checks: CheckResult[]): JobResult {
  return { state: 'finished', verdict, checks: checks.map((check) => ({ ...check, passed: verdict === 'matches' })), failureReason: null };
}

function jobWait(recorded: Steps, options: ProofOptions): ProofApi['waitForJob'] {
  return async (jobId, poller) => {
    recorded.steps.push(`proof job ${jobId} by ${poller}`);
    if (jobId.startsWith('job-verification')) return finished(options.verificationVerdict ?? 'matches', MITIGATED_CHECKS);
    options.stuckExperiment?.();
    return options.stuckExperiment ? STILL_RUNNING : finished(options.verdict ?? 'matches', FAULT_CHECKS);
  };
}

function publicationRead(recorded: Steps, options: ProofOptions): ProofApi['readPublication'] {
  const reads = { count: 0 };
  return async () => {
    recorded.steps.push('proof read publication');
    options.onPublicationRead?.();
    reads.count += 1;
    const failures = options.failedPublicationReads ?? 0;
    if (reads.count <= failures) throw new ToolAnswerError(404, 'Cannot GET');
    const sequence = options.publications ?? [options.publication ?? OPENED_PULL_REQUEST];
    return sequence[Math.min(reads.count - failures, sequence.length) - 1];
  };
}

export function stubProof(recorded: Steps, options: ProofOptions): ProofApi {
  const step = (name: string) => recorded.steps.push(name);
  return {
    recordContract: async () => {
      step('proof contract');
      if (options.proof === 'unavailable') throw new ToolAnswerError(404, 'Cannot POST /tool/incidents/inc-1/contract');
      return 'contract-1';
    },
    startExperiment: experimentStart(recorded, options),
    waitForJob: jobWait(recorded, options),
    reviewExperiment: async (review) => void step(`proof review ${review.id} ${review.accepted ? 'accepted' : 'rejected'}`),
    proposeMitigation: async (proposal) => (step(`proof mitigation ${proposal.variant} restart ${proposal.restart}`), 'mitigation-1'),
    startVerification: async () => (step('proof verification'), { id: 'run-1', jobId: 'job-verification-1' }),
    reviewVerification: async (review) => void step(`proof verification review ${review.accepted ? 'approved' : 'rejected'}`),
    readPublication: publicationRead(recorded, options),
  };
}
