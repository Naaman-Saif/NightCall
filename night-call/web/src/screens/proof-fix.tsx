import type { Mitigation, Snapshot } from '../api/contract';
import { describePublication, latestTrafficSourceOf } from '../format/experiment-live-text';
import { describeFixAction } from '../format/fix-text';
import { cycleTiles } from '../format/proof-text';
import { VerificationCycles } from '../kit';
import { DiffView } from './diff-view';
import { MitigationStatus, RECORDED_CONDITIONS } from './verification-panel';

export function FixSummary({ snapshot }: { snapshot: Snapshot }) {
  const { mitigation } = snapshot;
  if (!mitigation) return null;
  const action = describeFixAction(mitigation, snapshot.incident.service);
  return (
    <div className="proof-block" data-proof="fix">
      <div className="eyebrow">Fix</div>
      {action && <p className="proof-state">{action}</p>}
      <p className={action ? 'muted' : 'proof-state'}>{mitigation.explanation}</p>
      <DiffView diff={mitigation.diff} />
      <FixLimits mitigation={mitigation} />
    </div>
  );
}

function FixLimits({ mitigation }: { mitigation: Mitigation }) {
  return (
    <>
      {mitigation.caveats.length > 0 && (
        <ul className="report-list" data-tone="muted">
          {mitigation.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}
      <p className="muted">Does not fix: {mitigation.notFixed}</p>
    </>
  );
}

export function VerificationSummary({ snapshot }: { snapshot: Snapshot }) {
  const { mitigation } = snapshot;
  const hasStarted = snapshot.cycles.length > 0 || snapshot.currentVerificationRun !== null;
  if (!mitigation || !hasStarted) return null;
  const tiles = cycleTiles(snapshot.cycles, latestTrafficSourceOf(snapshot));
  return (
    <div className="proof-block" data-proof="verification" data-mitigation-status={mitigation.status}>
      <div className="eyebrow">Verification</div>
      <MitigationStatus mitigation={mitigation} cycles={snapshot.cycles} />
      <VerificationCycles cycles={tiles} conditions={RECORDED_CONDITIONS} />
    </div>
  );
}

export function PullRequestSummary({ snapshot }: { snapshot: Snapshot }) {
  const text = describePublication(snapshot);
  if (!text) return null;
  const { publication } = snapshot;
  const link = publication.state === 'published' ? publication.url : null;
  return (
    <div className="proof-block" data-proof="pull-request" data-publication={publication.state}>
      <div className="eyebrow">Pull request</div>
      <p className="proof-state">
        {text}
        {link && (
          <a className="source-link" href={link} target="_blank" rel="noreferrer">
            Open on GitHub
          </a>
        )}
      </p>
    </div>
  );
}
