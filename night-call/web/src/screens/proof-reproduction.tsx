import type { CheckResult, Experiment, Snapshot } from '../api/contract';
import { experimentLivePath } from '../api/live-run';
import type { IncidentMarker } from '../api/markers';
import { useExperimentSeries } from '../api/use-experiment-series';
import { WhatHappenedChart } from '../charts/what-happened-chart';
import { describeExperimentState, describeTrafficSource, latestExperimentOf } from '../format/experiment-live-text';
import { LiveRunPanel } from './live-run-panel';

type ReviewProps = { review: NonNullable<Experiment['review']> };

const NO_MARKERS: IncidentMarker[] = [];

export function ReproductionSummary({ snapshot }: { snapshot: Snapshot }) {
  const experiment = latestExperimentOf(snapshot, 'reproduction');
  if (!experiment) return null;
  return (
    <div className="proof-block" data-proof="reproduction" data-experiment={experiment.id}>
      <div className="eyebrow">Reproduction</div>
      <p className="proof-state">{describeExperimentState(experiment)}</p>
      <p className="muted">{describeTrafficSource(experiment)}</p>
      <LiveRunPanel livePath={experiment.finishedAt ? null : experimentLivePath(snapshot.incident.id, experiment.id)} />
      <ExperimentChart incidentId={snapshot.incident.id} experiment={experiment} />
      <CheckList checks={experiment.checks} />
      {experiment.review && <ReviewLine review={experiment.review} />}
    </div>
  );
}

function ExperimentChart({ incidentId, experiment }: { incidentId: string; experiment: Experiment }) {
  const series = useExperimentSeries(incidentId, experiment);
  if (!series || series.samples.length === 0) return null;
  return <WhatHappenedChart series={series} markers={NO_MARKERS} />;
}

function CheckList({ checks }: { checks: CheckResult[] }) {
  if (checks.length === 0) return null;
  return (
    <ul className="report-list">
      {checks.map((check) => (
        <li key={check.name} data-passed={check.passed}>
          {check.passed ? 'Passed' : 'Failed'}: {check.name}, observed {check.observed}
        </li>
      ))}
    </ul>
  );
}

function ReviewLine({ review }: ReviewProps) {
  return (
    <div>
      <p className="proof-state">{review.accepted ? 'Accepted in review' : 'Rejected in review'}</p>
      <ul className="report-list" data-tone="muted">
        {review.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}
