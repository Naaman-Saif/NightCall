import type { Cycle, Mitigation, Snapshot } from '../api/contract';
import { MITIGATION_STATUS_TEXT, countPassedRounds, cycleTiles } from '../format/proof-text';
import { Card, ClaimLabel, Icon, VerificationCycles } from '../kit';

const RECORDED_CONDITIONS = 'same checks and mitigation, fresh sandbox each round';

export function VerificationPanel({ snapshot }: { snapshot: Snapshot }) {
  const { mitigation } = snapshot;
  if (!mitigation) return null;
  return (
    <Card eyebrow="Mitigation" title={mitigation.explanation} className="section-verification">
      <div className="panel-stack" data-mitigation-status={mitigation.status}>
        <MitigationStatus mitigation={mitigation} cycles={snapshot.cycles} />
        <VerificationCycles cycles={cycleTiles(snapshot.cycles)} conditions={RECORDED_CONDITIONS} />
        <MitigationLimits mitigation={mitigation} />
      </div>
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

function MitigationLimits({ mitigation }: { mitigation: Mitigation }) {
  return (
    <div className="brief">
      <div>
        <div className="eyebrow">Does not fix</div>
        <p className="brief-next">{mitigation.notFixed}</p>
      </div>
      <ul className="brief-list">
        {mitigation.caveats.map((caveat) => (
          <li key={caveat}>
            <Icon name="minus" size={13} />
            {caveat}
          </li>
        ))}
      </ul>
    </div>
  );
}
