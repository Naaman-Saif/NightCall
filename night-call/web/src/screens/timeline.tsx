import { useState } from 'react';
import type { IncidentEvent } from '../api/contract';
import { describeEventType, isReportEvent } from '../format/event-text';
import { formatAbsolute, formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Button, Card, Icon, Tooltip } from '../kit';

const LATEST_EVENTS_SHOWN = 12;
const OPERATOR_LOOK = { icon: 'user', color: 'var(--night-200)' };
const NEUTRAL_LOOK = { icon: 'info', color: 'var(--text-muted)' };

export function Timeline({ events }: { events: IncidentEvent[] }) {
  const now = useNow();
  const [isShowingAll, setShowingAll] = useState(false);
  const newestFirst = events.filter(isReportEvent).reverse();
  const shown = isShowingAll ? newestFirst : newestFirst.slice(0, LATEST_EVENTS_SHOWN);
  return (
    <Card eyebrow="Record" title="Latest activity" actions={<span className="meta">{newestFirst.length} events</span>} className="section-timeline">
      {newestFirst.length === 0 && <p className="muted">No events received yet.</p>}
      <ol className="timeline">
        {shown.map((event) => (
          <TimelineRow key={event.sequence} event={event} now={now} />
        ))}
      </ol>
      {newestFirst.length > LATEST_EVENTS_SHOWN && (
        <ShowAllToggle isShowingAll={isShowingAll} total={newestFirst.length} onToggle={() => setShowingAll(!isShowingAll)} />
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
  const look = event.actor === 'operator' ? OPERATOR_LOOK : NEUTRAL_LOOK;
  return (
    <li className="timeline-row" data-actor={event.actor} data-type={event.type} data-sequence={event.sequence}>
      <span className="timeline-avatar" style={{ color: look.color }}>
        <Icon name={look.icon} size={14} />
      </span>
      <div className="timeline-body">
        <div className="timeline-meta">
          <span>{describeEventType(event.type)}</span>
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
