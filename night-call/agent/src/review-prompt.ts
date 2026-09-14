import type { ReviewRequest } from './review-types.js';

const EVIDENCE_LIMIT = 3000;

export const REVIEWER_SYSTEM_PROMPT = [
  'You review one run in a test copy of a production service for NightCall\'s incident report.',
  'Judge only from the recorded checks, their observed values and the evidence you are given.',
  'Accept only if the run shows what it is meant to show. Reject if it does not.',
  'Give one to four reasons. Each reason is one plain sentence of at most 25 words that quotes an observed value exactly as given.',
  'Keep your thinking brief and answer directly.',
  'Never say anything is proven. Never mention agents, roles, models or yourself.',
].join(' ');

const QUESTIONS = {
  reproduction: 'Question: did this run reproduce the incident failure for the cause below?',
  verification: 'Question: did this verification run show that the mitigation stops the failure for the cause below?',
};

const CONTRACT_SIDE = { reproduction: 'fault.', verification: 'mitigated.' };

export function reviewPrompt(request: ReviewRequest): string {
  const relevant = request.contract.filter((check) => check.name.startsWith(CONTRACT_SIDE[request.kind]));
  const contract = relevant.map((check) => `- ${check.name} ${check.comparator} ${check.value} ${check.unit}`);
  const checks = request.checks.map((check) => `- ${check.name}: ${check.passed ? 'passed' : 'failed'}, observed ${check.observed ?? 'no observation'}`);
  return [
    QUESTIONS[request.kind],
    `Cause: ${request.cause}`,
    'What counts as the same failure (contract):',
    ...contract,
    `Verdict reported by the run: ${request.verdict ?? 'none'}`,
    'Checks with observed values:',
    ...(checks.length > 0 ? checks : ['- no checks were reported']),
    'Evidence:',
    request.evidence.slice(0, EVIDENCE_LIMIT),
    'Answer with decision accept or reject and one to four reasons, each at most 25 words.',
  ].join('\n');
}
