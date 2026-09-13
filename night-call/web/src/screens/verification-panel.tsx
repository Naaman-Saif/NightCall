import type { Cycle, Mitigation, Snapshot } from '../api/contract';
import { MITIGATION_STATUS_TEXT, countPassedRounds, cycleTiles } from '../format/proof-text';
import { Card, ClaimLabel, VerificationCycles } from '../kit';

const RECORDED_CONDITIONS = 'same checks and mitigation, fresh sandbox each round';

export function VerificationPanel({ snapshot }: { snapshot: Snapshot }) {
  const { mitigation } = snapshot;
  return (
    <Card title="Verification" className="section-verification">
      {mitigation ? (
        <div className="panel-stack" data-mitigation-status={mitigation.status}>
          <MitigationStatus mitigation={mitigation} cycles={snapshot.cycles} />
          <VerificationCycles cycles={cycleTiles(snapshot.cycles)} conditions={RECORDED_CONDITIONS} />
        </div>
      ) : (
        <p className="muted">Verification starts once a mitigation is proposed.</p>
      )}
    </Card>
  );
}

function MitigationStatus({ mitigation, cycles }: { mitigation: Mitigation; cycles: Cycle[] }) {
  if (mitigation.status === 'verified') {
    return <ClaimLabel claim="verified" qualifier="3 of 3 rounds passed under the recorded conditions" />;
  }
  return (
    <p className="status-line">
      {MITIGATION_STATUS_TEXT[mitigation.status]} · {countPassedRounds(cycles)} of 3 rounds passed
    </p>
  );
}
