import type { ReactNode } from 'react';
import type { Hypothesis, Snapshot } from '../api/contract';
import { hypothesisClaim } from '../format/claims';
import { Card, HypothesisCard } from '../kit';
import { EvidenceLine } from './source-links';

type HypothesisViewProps = { snapshot: Snapshot; hypothesis: Hypothesis; index: number };

export function HypothesesPanel({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Card title="Possible causes" className="section-hypotheses">
      {snapshot.hypotheses.length === 0 && <p className="muted">No possible cause yet. Evidence is gathered first.</p>}
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
      supporting={evidenceLines(snapshot, hypothesis.supportingEvidenceIds)}
      contradicting={evidenceLines(snapshot, hypothesis.contradictingEvidenceIds)}
      nextStep={isOpen ? `check the prediction. ${hypothesis.predicted}` : undefined}
    />
  );
}

function evidenceLines(snapshot: Snapshot, evidenceIds: string[]): ReactNode[] {
  return evidenceIds.map((evidenceId) => (
    <EvidenceLine key={evidenceId} evidence={snapshot.evidence[evidenceId]} fallback={evidenceId} />
  ));
}
