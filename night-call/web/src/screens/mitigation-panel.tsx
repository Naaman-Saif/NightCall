import type { Mitigation, Snapshot } from '../api/contract';
import { Card, Icon } from '../kit';
import { ExperimentCard } from './experiment-card';

export function MitigationPanel({ snapshot }: { snapshot: Snapshot }) {
  const { mitigation } = snapshot;
  const experiments = snapshot.experiments.filter((experiment) => experiment.kind === 'mitigation');
  return (
    <Card title="Mitigation" className="section-mitigation">
      <div className="panel-stack">
        {mitigation ? <MitigationSummary mitigation={mitigation} /> : <p className="muted">No mitigation proposed yet.</p>}
        {experiments.map((experiment) => (
          <ExperimentCard key={experiment.id} experiment={experiment} />
        ))}
      </div>
    </Card>
  );
}

function MitigationSummary({ mitigation }: { mitigation: Mitigation }) {
  return (
    <div className="brief">
      <p className="brief-summary">{mitigation.explanation}</p>
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
