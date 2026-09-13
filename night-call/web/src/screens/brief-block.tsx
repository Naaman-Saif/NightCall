import type { Brief } from '../api/contract';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Card, Icon, RoleTag } from '../kit';

export function BriefBlock({ brief }: { brief: Brief | null }) {
  return (
    <Card eyebrow="Investigation lead" title="Incident brief" actions={<RoleTag role="lead" />}>
      {brief ? <BriefContent brief={brief} /> : <p className="muted">The lead has not written the brief yet.</p>}
    </Card>
  );
}

function BriefContent({ brief }: { brief: Brief }) {
  const now = useNow();
  return (
    <div className="brief">
      <p className="brief-summary">{brief.summary}</p>
      <BriefList title="Known" icon="check" items={brief.knownFacts.map((fact) => fact.text)} />
      <BriefList title="Still unknown" icon="circle-dashed" items={brief.unknowns} />
      <div>
        <div className="eyebrow">Next step</div>
        <p className="brief-next">{brief.nextStep}</p>
      </div>
      <p className="meta">Updated {formatAgo(brief.updatedAt, now)}</p>
    </div>
  );
}

function BriefList({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="eyebrow">{title}</div>
      <ul className="brief-list">
        {items.map((item) => (
          <li key={item}>
            <Icon name={icon} size={13} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
