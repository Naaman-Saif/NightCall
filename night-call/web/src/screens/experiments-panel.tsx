import type { CheckResult, Experiment } from '../api/contract';
import { experimentClaim } from '../format/claims';
import { EXPERIMENT_KIND_TEXT, describeProgress, describeRecipe } from '../format/experiment-text';
import { Badge, Card, ClaimLabel, EvidenceRow, Icon, RoleTag } from '../kit';

export function ExperimentsPanel({ experiments }: { experiments: Experiment[] }) {
  return (
    <Card eyebrow="Experiment investigator" title="Experiments" actions={<RoleTag role="investigator" />} className="section-experiments">
      {experiments.length === 0 && <p className="muted">No experiment has started yet.</p>}
      <div className="card-stack">
        {experiments.map((experiment) => (
          <ExperimentCard key={experiment.id} experiment={experiment} />
        ))}
      </div>
    </Card>
  );
}

function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const claim = experimentClaim(experiment);
  return (
    <article className="summary-card" data-experiment={experiment.id}>
      <div className="summary-card-head">
        <span className="eyebrow">{EXPERIMENT_KIND_TEXT[experiment.kind]}</span>
        {!experiment.finishedAt && <Badge tone="accent" dot>Running</Badge>}
      </div>
      <p className="summary-card-title">{experiment.purpose}</p>
      <p className="meta">{describeRecipe(experiment.recipe)}</p>
      <p className="meta">{describeProgress(experiment.progress)}</p>
      {claim && <ClaimLabel size="sm" claim={claim.claim} qualifier={claim.qualifier} />}
      <CheckRows checks={experiment.checks} />
      {experiment.review && <ReviewReasons accepted={experiment.review.accepted} reasons={experiment.review.reasons} />}
    </article>
  );
}

function CheckRows({ checks }: { checks: CheckResult[] }) {
  if (checks.length === 0) return null;
  return (
    <div>
      {checks.map((check) => (
        <EvidenceRow
          key={check.name}
          label={check.name}
          value={String(check.observed)}
          tone={check.passed ? 'verified' : 'critical'}
          source={check.passed ? 'check passed' : 'check failed'}
        />
      ))}
    </div>
  );
}

function ReviewReasons({ accepted, reasons }: { accepted: boolean; reasons: string[] }) {
  return (
    <ul className="brief-list">
      {reasons.map((reason) => (
        <li key={reason}>
          <Icon name={accepted ? 'check' : 'x'} size={13} />
          {reason}
        </li>
      ))}
    </ul>
  );
}
