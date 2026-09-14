import type { LiveRun, LiveStageEntry } from '../api/live-run';
import { useLiveRun } from '../api/use-live-run';
import { describeLiveMemory, describeLiveProgress, describeLiveStep } from '../format/live-run-text';
import { collapseRepeatedStages, describeStageRow } from '../format/live-stage-text';
import { formatTimeOfDay } from '../format/time';
import { LiveRequestFeed } from './live-request-feed';

type PanelProps = { livePath: string | null; service: string };
type ViewProps = { live: LiveRun; service: string };

export function LiveRunPanel({ livePath, service }: PanelProps) {
  const live = useLiveRun(livePath);
  return live ? <LiveRunView live={live} service={service} /> : null;
}

export function LiveRunView({ live, service }: ViewProps) {
  return (
    <section className="live-run" data-stage={live.stage} aria-live="polite">
      <p className="live-step">
        <span className="now-dot" data-connection="live" aria-hidden>
          <span className="connection-dot-ring"><span className="connection-dot" /></span>
        </span>
        {describeLiveStep(live)}
      </p>
      <LiveProgress live={live} />
      <p className="meta live-memory">{describeLiveMemory(live)}</p>
      <LiveRequestFeed requests={live.lastRequests} />
      <StageChecklist stages={live.stages} service={service} />
    </section>
  );
}

function LiveProgress({ live }: { live: LiveRun }) {
  const planned = live.requestsPlanned ?? 0;
  const share = planned > 0 ? Math.min(100, (live.requestsSent / planned) * 100) : 0;
  return (
    <div className="live-progress-block">
      <div className="live-progress" role="progressbar" aria-valuemin={0} aria-valuemax={planned} aria-valuenow={live.requestsSent}>
        <div className="live-progress-fill" style={{ width: `${share}%` }} />
      </div>
      <p className="meta">{describeLiveProgress(live)}</p>
    </div>
  );
}

function StageChecklist({ stages, service }: { stages: LiveStageEntry[]; service: string }) {
  if (stages.length === 0) return null;
  return (
    <ol className="live-stages">
      {collapseRepeatedStages(stages).map((entry, index) => (
        <li key={`${index}-${entry.stage}`} data-stage={entry.stage}>
          <span className="live-stage-time">{formatTimeOfDay(entry.at)}</span>
          <span>{describeStageRow({ entry, service })}</span>
        </li>
      ))}
    </ol>
  );
}
