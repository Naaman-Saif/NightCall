import type { Publication, Snapshot } from '../api/contract';
import { describePhase } from '../format/incident-text';
import { Banner, Card, EvidenceRow } from '../kit';
import { DiffView } from './diff-view';

type ResultKind = Publication['state'] | 'unresolved';

const RESULT_TITLE: Record<ResultKind, string> = {
  not_eligible: 'No pull request yet',
  publishing: 'Opening the mitigation pull request',
  published: 'Mitigation pull request opened',
  failed: 'The pull request could not be opened',
  unresolved: 'Finished without a pull request',
};

const NOT_DEPLOYED_NOTE = 'NightCall has not deployed this mitigation. Merging and deploying stay your decision.';

function resultKindOf(snapshot: Snapshot): ResultKind {
  const isFinishedWithoutPublication = snapshot.publication.state === 'not_eligible' && snapshot.incident.lifecycle === 'finished';
  return isFinishedWithoutPublication ? 'unresolved' : snapshot.publication.state;
}

export function ResultPanel({ snapshot }: { snapshot: Snapshot }) {
  const kind = resultKindOf(snapshot);
  if (kind === 'not_eligible') return null;
  return (
    <Card eyebrow="Result" title={RESULT_TITLE[kind]} tone={kind === 'failed' ? 'critical' : 'default'} className="section-result" data-result={kind}>
      {kind === 'unresolved' ? (
        <p className="result-note">{describePhase(snapshot.incident)}. No verified mitigation was published, so no pull request was opened.</p>
      ) : (
        <PullRequestResult publication={snapshot.publication} />
      )}
    </Card>
  );
}

function PullRequestResult({ publication }: { publication: Publication }) {
  return (
    <div className="panel-stack">
      {publication.state === 'failed' && (
        <Banner tone="critical" title="Publication failed">
          {publication.failureReason ?? 'No reason was recorded.'} The verified proof still stands.
        </Banner>
      )}
      <div>
        <EvidenceRow label="Repository" value={publication.repository ?? 'not recorded'} />
        <EvidenceRow label="Base branch" value={publication.baseBranch ?? 'not recorded'} source="demo branch, not production" />
        <EvidenceRow label="Pull request" value={<PullRequestLink publication={publication} />} />
      </div>
      <DiffView diff={publication.diff} />
      <p className="result-note">{NOT_DEPLOYED_NOTE}</p>
    </div>
  );
}

function PullRequestLink({ publication }: { publication: Publication }) {
  if (!publication.url || publication.number === null) return <>not opened</>;
  return (
    <a href={publication.url} target="_blank" rel="noreferrer">
      #{publication.number}
    </a>
  );
}
