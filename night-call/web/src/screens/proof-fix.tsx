import type { Mitigation, Publication, Snapshot } from '../api/contract';
import { describePublication } from '../format/experiment-live-text';
import { cycleTiles } from '../format/proof-text';
import { VerificationCycles } from '../kit';
import { DiffView } from './diff-view';
import { MitigationStatus, RECORDED_CONDITIONS } from './verification-panel';

export function FixSummary({ mitigation }: { mitigation: Mitigation | null }) {
  if (!mitigation) return null;
  return (
    <div className="proof-block" data-proof="fix">
      <div className="eyebrow">Fix</div>
      <p className="proof-state">{mitigation.explanation}</p>
      <DiffView diff={mitigation.diff} />
      {mitigation.caveats.length > 0 && (
        <ul className="report-list" data-tone="muted">
          {mitigation.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}
      <p className="muted">Does not fix: {mitigation.notFixed}</p>
    </div>
  );
}

export function VerificationSummary({ snapshot }: { snapshot: Snapshot }) {
  const { mitigation } = snapshot;
  const hasStarted = snapshot.cycles.length > 0 || snapshot.currentVerificationRun !== null;
  if (!mitigation || !hasStarted) return null;
  return (
    <div className="proof-block" data-proof="verification" data-mitigation-status={mitigation.status}>
      <div className="eyebrow">Verification</div>
      <MitigationStatus mitigation={mitigation} cycles={snapshot.cycles} />
      <VerificationCycles cycles={cycleTiles(snapshot.cycles)} conditions={RECORDED_CONDITIONS} />
    </div>
  );
}

export function PullRequestSummary({ publication }: { publication: Publication }) {
  const text = describePublication(publication);
  if (!text) return null;
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
