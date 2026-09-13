import type { Hypothesis, Snapshot } from '../api/contract';
import { hypothesisClaim } from '../format/claims';
import { Card, HypothesisCard, RoleTag } from '../kit';

type HypothesisViewProps = { snapshot: Snapshot; hypothesis: Hypothesis; index: number };

export function HypothesesPanel({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card eyebrow="Investigation lead" title="Hypotheses" actions={<RoleTag role="lead" />} className="section-hypotheses">
      {snapshot.hypotheses.length === 0 && <p className="muted">No hypothesis yet. The lead gathers evidence first.</p>}
      <div className="card-stack">
        {snapshot.hypotheses.map((hypothesis, index) => (
          <HypothesisView key={hypothesis.id} snapshot={snapshot} hypothesis={hypothesis} index={index + 1} />
        ))}
      </div>
    </Card>
  );
}

function HypothesisView({ snapshot, hypothesis, index }: HypothesisViewProps) {
  const { claim, qualifier } = hypothesisClaim(snapshot, hypothesis);
  const isOpen = hypothesis.status === 'proposed' || hypothesis.status === 'testing';
  return (
    <HypothesisCard
      data-hypothesis={hypothesis.id}
      index={index}
      title={hypothesis.claim}
      claim={claim}
      qualifier={qualifier}
      supporting={evidenceSummaries(snapshot, hypothesis.supportingEvidenceIds)}
      contradicting={evidenceSummaries(snapshot, hypothesis.contradictingEvidenceIds)}
      nextStep={isOpen ? `check the prediction. ${hypothesis.predicted}` : undefined}
    />
  );
}

function evidenceSummaries(snapshot: Snapshot, evidenceIds: string[]): string[] {
  return evidenceIds.map((evidenceId) => snapshot.evidence[evidenceId]?.summary ?? evidenceId);
}
