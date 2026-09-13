import type { Brief, Evidence, KnownFact, Snapshot } from '../api/contract';
import { describeMissingBrief, describeUnfinishedInvestigation, investigationOf } from '../format/investigation-text';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Card, Icon } from '../kit';
import { SourceLinks } from './source-links';

type EvidenceById = Record<string, Evidence>;

export function BriefBlock({ snapshot }: { snapshot: Snapshot }) {
  const progressText = describeUnfinishedInvestigation(snapshot);
  return (
    <Card title="What happened" className="section-brief" data-investigation={investigationOf(snapshot)}>
      {snapshot.brief && progressText && <p className="status-line investigation-progress">{progressText}</p>}
      {snapshot.brief ? (
        <BriefContent brief={snapshot.brief} evidence={snapshot.evidence} />
      ) : (
        <p className="muted">{describeMissingBrief(snapshot)}</p>
      )}
    </Card>
  );
}

function BriefContent({ brief, evidence }: { brief: Brief; evidence: EvidenceById }) {
  const now = useNow();
  return (
    <div className="brief">
      <p className="brief-summary">{brief.summary}</p>
      <KnownFacts facts={brief.knownFacts} evidence={evidence} />
      <div>
        <div className="eyebrow">Next step</div>
        <p className="brief-next">{brief.nextStep}</p>
      </div>
      <p className="meta">Updated {formatAgo(brief.updatedAt, now)}</p>
    </div>
  );
}

function KnownFacts({ facts, evidence }: { facts: KnownFact[]; evidence: EvidenceById }) {
  if (facts.length === 0) return null;
  return (
    <div>
      <div className="eyebrow">Known</div>
      <ul className="brief-list">
        {facts.map((fact) => (
          <FactLine key={fact.text} fact={fact} evidence={evidence} />
        ))}
      </ul>
    </div>
  );
}

function FactLine({ fact, evidence }: { fact: KnownFact; evidence: EvidenceById }) {
  return (
    <li>
      <Icon name="check" size={13} />
      <span>
        {fact.text}
        {fact.evidenceIds.map((evidenceId) => (
          <SourceLinks key={evidenceId} links={evidence[evidenceId]?.sourceLinks} />
        ))}
      </span>
    </li>
  );
}
