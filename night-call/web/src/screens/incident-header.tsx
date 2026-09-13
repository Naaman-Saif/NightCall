import type { Incident } from '../api/contract';
import type { ConnectionState } from '../api/use-connection-state';
import { describeAttention, describeBudgetLeft, describeElapsed, describePhase } from '../format/incident-text';
import { formatAbsolute, formatClock } from '../format/time';
import { useNow } from '../format/use-now';
import { Badge, DemoBadge } from '../kit';
import { ConnectionBadge } from './connection-badge';

export function IncidentHeader({ incident, connection }: { incident: Incident; connection: ConnectionState }) {
  return (
    <header className="incident-header">
      <div className="incident-header-tags">
        <span className="meta">{incident.label}</span>
        <Badge tone={incident.severity === 'critical' ? 'critical' : 'neutral'} dot>{incident.severity}</Badge>
        <Badge numeric uppercase>{incident.service}</Badge>
        {incident.illustrative && <DemoBadge />}
        <ConnectionBadge connection={connection} />
      </div>
      <h1 className="incident-title">{incident.alertName}</h1>
      <IncidentFacts incident={incident} />
    </header>
  );
}

function IncidentFacts({ incident }: { incident: Incident }) {
  const now = useNow();
  return (
    <dl className="incident-facts">
      <Fact label="Started" value={formatClock(incident.startedAt)} detail={formatAbsolute(incident.startedAt)} />
      <Fact label="Elapsed" value={describeElapsed(incident, now)} />
      <Fact label="Budget left" value={describeBudgetLeft(incident, now)} />
      <Fact label="Phase" value={describePhase(incident)} />
      <Fact label="Attention" value={describeAttention(incident.attention)} />
    </dl>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="fact">
      <dt className="eyebrow">{label}</dt>
      <dd title={detail}>{value}</dd>
    </div>
  );
}
