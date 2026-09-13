import type { Reproduction, Snapshot } from '../api/contract';
import { Card } from '../kit';
import { ExperimentCard } from './experiment-card';

const REPRODUCTION_TEXT: Record<Reproduction, string> = {
  untested: 'Not tested yet',
  testing: 'Trying to reproduce the failure in the sandbox',
  confirmed: 'Reproduced in the sandbox',
  not_reproduced: 'Not reproduced in the sandbox',
  inconclusive: 'Reproduction was inconclusive',
};

export function ReproductionPanel({ snapshot }: { snapshot: Snapshot }) {
  const experiments = snapshot.experiments.filter((experiment) => experiment.kind === 'reproduction');
  return (
    <Card title="Reproduction" className="section-reproduction" data-reproduction={snapshot.reproduction}>
      <div className="panel-stack">
        <p className="status-line">{REPRODUCTION_TEXT[snapshot.reproduction] ?? snapshot.reproduction}</p>
        {experiments.map((experiment) => (
          <ExperimentCard key={experiment.id} experiment={experiment} />
        ))}
      </div>
    </Card>
  );
}
