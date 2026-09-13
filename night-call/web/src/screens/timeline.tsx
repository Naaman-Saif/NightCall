import type { Actor, IncidentEvent } from '../api/contract';
import { formatAbsolute, formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Card, Icon, Tooltip } from '../kit';

type ActorLook = { label: string; icon: string; color: string };

const ACTOR_LOOK: Record<Actor, ActorLook> = {
  lead: { label: 'Lead', icon: 'compass', color: 'var(--beacon-300)' },
  investigator: { label: 'Investigator', icon: 'flask-conical', color: 'var(--observed-400)' },
  verifier: { label: 'Verifier', icon: 'shield-check', color: 'var(--verified-400)' },
  operator: { label: 'Operator', icon: 'user', color: 'var(--night-200)' },
  system: { label: 'System', icon: 'server', color: 'var(--text-muted)' },
  runner: { label: 'Runner', icon: 'play', color: 'var(--text-muted)' },
};

export function Timeline({ events }: { events: IncidentEvent[] }) {
  const now = useNow();
  const newestFirst = [...events].reverse();
  return (
    <Card eyebrow="Record" title="Timeline" actions={<span className="meta">{events.length} events</span>}>
      {events.length === 0 && <p className="muted">No events received yet.</p>}
      <ol className="timeline">
        {newestFirst.map((event) => (
          <TimelineRow key={event.sequence} event={event} now={now} />
        ))}
      </ol>
    </Card>
  );
}

function TimelineRow({ event, now }: { event: IncidentEvent; now: number }) {
  const look = ACTOR_LOOK[event.actor] ?? ACTOR_LOOK.system;
  return (
    <li className="timeline-row" data-actor={event.actor} data-type={event.type}>
      <span className="timeline-avatar" style={{ color: look.color }}>
        <Icon name={look.icon} size={14} />
      </span>
      <div className="timeline-body">
        <div className="timeline-meta">
          <span style={{ color: look.color }}>{look.label}</span>
          <span aria-hidden>·</span>
          <Tooltip content={formatAbsolute(event.occurredAt)}>
            <span>{formatAgo(event.occurredAt, now)}</span>
          </Tooltip>
        </div>
        <div className="timeline-summary">{event.summary}</div>
      </div>
    </li>
  );
}
