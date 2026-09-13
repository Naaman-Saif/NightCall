import { Badge } from '../kit';

export const MANUALLY_TRIGGERED = 'Manually triggered';

export function ManualTag({ alertName }: { alertName: string }) {
  if (alertName !== MANUALLY_TRIGGERED) return null;
  return (
    <Badge tone="neutral" icon="user" data-manual-tag>
      {MANUALLY_TRIGGERED}
    </Badge>
  );
}
