import { useState } from 'react';
import type { Actor, IncidentEvent } from '../api/contract';
import { formatAbsolute, formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Button, Card, Icon, Tooltip } from '../kit';

type ActorLook = { label: string; icon: string; color: string };

const LATEST_EVENTS_SHOWN = 12;

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
  const [isShowingAll, setShowingAll] = useState(false);
  const newestFirst = [...events].reverse();
  const shown = isShowingAll ? newestFirst : newestFirst.slice(0, LATEST_EVENTS_SHOWN);
  return (
    <Card eyebrow="Record" title="Latest activity" actions={<span className="meta">{events.length} events</span>} className="section-timeline">
      {events.length === 0 && <p className="muted">No events received yet.</p>}
      <ol className="timeline">
        {shown.map((event) => (
          <TimelineRow key={event.sequence} event={event} now={now} />
        ))}
      </ol>
      {events.length > LATEST_EVENTS_SHOWN && (
        <ShowAllToggle isShowingAll={isShowingAll} total={events.length} onToggle={() => setShowingAll(!isShowingAll)} />
      )}
    </Card>
  );
}

function ShowAllToggle({ isShowingAll, total, onToggle }: { isShowingAll: boolean; total: number; onToggle: () => void }) {
  return (
    <Button size="sm" variant="ghost" style={{ marginTop: 'var(--sp-3)' }} onClick={onToggle}>
      {isShowingAll ? 'Show the latest only' : `Show all ${total} events`}
    </Button>
  );
}

function TimelineRow({ event, now }: { event: IncidentEvent; now: number }) {
  const look = ACTOR_LOOK[event.actor] ?? ACTOR_LOOK.system;
  return (
    <li className="timeline-row" data-actor={event.actor} data-type={event.type} data-sequence={event.sequence}>
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
