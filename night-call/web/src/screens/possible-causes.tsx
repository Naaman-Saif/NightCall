import type { CauseLine, Contradiction, Evidence, Hypothesis, RunCause, RunStatus } from '../api/contract';
import { CAUSE_STATUS_TEXT, isRunOver, sortCauses } from '../format/cause-text';
import { contradictionFor } from '../format/contradiction-text';
import { SourceLinks } from './source-links';

type EvidenceById = Record<string, Evidence>;
type CausesProps = { causes: RunCause[] | undefined; status: RunStatus; evidence: EvidenceById; hypotheses: Hypothesis[] };
type CardProps = { cause: RunCause; evidence: EvidenceById; contradictions?: Contradiction[] };
type LinesProps = { lines: CauseLine[]; label: string; evidence: EvidenceById; contradictions?: Contradiction[] };

const LINES_SHOWN_PER_SIDE = 3;

export function PossibleCauses({ causes = [], status, evidence, hypotheses }: CausesProps) {
  if (causes.length === 0 && !isRunOver(status)) return null;
  return (
    <div className="possible-causes">
      <div className="eyebrow">Possible causes</div>
      {causes.length === 0 && <p className="muted">No cause stands out yet.</p>}
      {sortCauses(causes).map((cause) => (
        <CauseCard key={cause.id} cause={cause} evidence={evidence}
          contradictions={hypotheses.find((hypothesis) => hypothesis.id === cause.id)?.contradictions} />
      ))}
    </div>
  );
}

function CauseCard({ cause, evidence, contradictions }: CardProps) {
  return (
    <article className="cause" data-cause-status={cause.status}>
      <p className="cause-claim">{cause.claim}</p>
      <p className="cause-status">{CAUSE_STATUS_TEXT[cause.status] ?? cause.status}</p>
      <CauseLines lines={cause.supporting} label="For" evidence={evidence} />
      <CauseLines lines={cause.contradicting} label="Against" evidence={evidence} contradictions={contradictions} />
      {cause.confirmBy && <p className="muted">Would be confirmed by: {cause.confirmBy}</p>}
    </article>
  );
}

function CauseLines({ lines, label, evidence, contradictions }: LinesProps) {
  if (lines.length === 0) return null;
  return (
    <ul className="report-list cause-lines" data-side={label.toLowerCase()}>
      {lines.slice(0, LINES_SHOWN_PER_SIDE).map((line, index) => (
        <li key={`${index}-${line.text}`}>
          <span className="cause-side">{label}:</span> {line.text}
          <SourceLinks links={line.evidenceId ? evidence[line.evidenceId]?.sourceLinks?.slice(0, 1) : undefined} />
          <ContradictionLine text={contradictionFor(contradictions, line.evidenceId)} />
        </li>
      ))}
    </ul>
  );
}

export function ContradictionLine({ text }: { text: string | null }) {
  if (!text) return null;
  return <span className="muted contradiction-line">{text}</span>;
}
