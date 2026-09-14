import type { ConnectionState } from '../api/use-connection-state';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';

export type ConnectionBadgeProps = { connection: ConnectionState; latestSequence: number; lastUpdateAt: string; isFinished?: boolean };

const CONNECTION_TEXT: Record<Exclude<ConnectionState, 'stale'>, string> = {
  connecting: 'Connecting',
  live: 'Live',
  reconnecting: 'Reconnecting',
};

function useConnectionText({ connection, lastUpdateAt, isFinished }: ConnectionBadgeProps): string {
  const now = useNow();
  if (isFinished) return 'Finished';
  if (connection === 'stale') return `Stale, last update ${formatAgo(lastUpdateAt, now)}`;
  return CONNECTION_TEXT[connection];
}

export function ConnectionBadge(props: ConnectionBadgeProps) {
  const text = useConnectionText(props);
  return (
    <span className="connection-badge" role="status" data-connection={props.isFinished ? 'finished' : props.connection}>
      <span className="connection-dot-ring" aria-hidden>
        <span key={props.latestSequence} className="connection-dot" data-sequence={props.latestSequence} />
      </span>
      {text}
    </span>
  );
}
