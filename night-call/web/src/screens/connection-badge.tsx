import type { ConnectionState } from '../api/use-connection-state';
import { Badge } from '../kit';

type ConnectionLook = { icon: string; text: string; tone: 'neutral' | 'critical' };

const CONNECTION_LOOK: Record<ConnectionState, ConnectionLook> = {
  connecting: { icon: 'loader-circle', text: 'Connecting', tone: 'neutral' },
  live: { icon: 'radio', text: 'Live', tone: 'neutral' },
  reconnecting: { icon: 'refresh-cw', text: 'Reconnecting', tone: 'neutral' },
  stale: { icon: 'wifi-off', text: 'Stale, showing last data', tone: 'critical' },
};

export function ConnectionBadge({ connection }: { connection: ConnectionState }) {
  const look = CONNECTION_LOOK[connection];
  return (
    <Badge className="connection-badge" role="status" data-connection={connection} tone={look.tone} icon={look.icon}>
      {look.text}
    </Badge>
  );
}
