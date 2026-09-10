import type { FailureSignature } from '../probes/reading';
import type { Trial } from '../sandbox/trial.service';
import type { EvidenceBundle } from '../pipeline/evidence-bundle';

export interface IssueProse {
  title: string;
  hypothesisSection: string;
  nextStep: string;
}

function signatureLine(signature: FailureSignature): string {
  const entries = Object.entries(signature);
  return entries.length === 0 ? 'no failing probes' : entries.map(([name, value]) => `${name} ${value}`).join(', ');
}

function trialLine(trial: Trial, index: number): string {
  const call = trial.candidate.value ? `${trial.candidate.action}(${trial.candidate.target}, ${trial.candidate.value})` : `${trial.candidate.action}(${trial.candidate.target})`;
  return `${index + 1}. \`${call}\` : **${trial.verdict}** : before ${signatureLine(trial.before)} : after ${signatureLine(trial.after)}\n   ${trial.candidate.rationale}${trial.note ? ` (${trial.note})` : ''}`;
}

function reproductionSection(bundle: EvidenceBundle): string {
  const r = bundle.reproduction;
  if (!r) return 'Not attempted: the config diff since the last healthy snapshot was empty, so there was nothing to replay.';
  return [
    `Green baseline: ${signatureLine(r.baseline)}`,
    `After replaying config diff: ${signatureLine(r.afterReplay)}`,
    `Production signature: ${signatureLine(r.production)}`,
    `Matches production signature: **${r.reproduced ? 'yes' : 'no'}**`,
    r.reproduced ? '' : '\nCould not reproduce in the clone. Treat the hypothesis above as a lead, not a conclusion. No trials were run.',
  ].join('\n');
}

export function renderIssueBody(bundle: EvidenceBundle, prose: IssueProse): string {
  const humans = bundle.trials.filter((t) => t.verdict === 'needs_human');
  const diff = bundle.diff.map((c) => `- ${c.flag}: ${c.from} -> ${c.to}`).join('\n') || '- none';
  return [
    '## Alert', `${bundle.incident.alert.name}, fired ${bundle.incident.alert.firedAt}, service ${bundle.incident.alert.service}`,
    '', '## Hypothesis', prose.hypothesisSection, `Confidence: ${bundle.hypothesis.confidence}. Evidence: ${bundle.hypothesis.evidence.join('; ')}`,
    '', '## Reproduction in sandbox', reproductionSection(bundle),
    '', '## Fix candidates', bundle.trials.map(trialLine).join('\n') || 'none proposed',
    '', '## Needs a human', humans.map((t) => `- \`${t.candidate.action}(${t.candidate.target}, ${t.candidate.value})\`: ${t.candidate.rationale}`).join('\n') || 'none',
    '', '## Diff replayed', diff,
    '', '## Next step', prose.nextStep,
    '', '_Filed by Night Call. Production was read only throughout; every trial ran in a disposable copy of the stack._',
  ].join('\n');
}
