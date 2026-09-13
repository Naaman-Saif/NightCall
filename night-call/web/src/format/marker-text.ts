import type { IncidentMarker, MarkerKind } from '../api/markers';

export type MarkerLook = { short: string; color: string };

const MARKER_LOOK: Record<MarkerKind, MarkerLook> = {
  config_change: { short: 'Config', color: 'var(--text-muted)' },
  crash: { short: 'Crash', color: 'var(--critical-400)' },
  restart: { short: 'Restart', color: 'var(--text-muted)' },
  alarm: { short: 'Alarm', color: 'var(--critical-400)' },
  operator_answer: { short: 'Answer', color: 'var(--night-200)' },
  fix_verified: { short: 'Verified', color: 'var(--verified-400)' },
  pr_opened: { short: 'PR', color: 'var(--text-link)' },
};

const UNKNOWN_MARKER_LOOK: MarkerLook = { short: 'Event', color: 'var(--text-muted)' };

const NOTHING_DEPLOYED = 'Nothing was deployed, so the live line is unchanged.';

export function markerLookOf(kind: MarkerKind): MarkerLook {
  return MARKER_LOOK[kind] ?? UNKNOWN_MARKER_LOOK;
}

export function markerNote(kind: MarkerKind): string | null {
  return kind === 'fix_verified' || kind === 'pr_opened' ? NOTHING_DEPLOYED : null;
}

export function hasSandboxOnlyMarker(markers: IncidentMarker[]): boolean {
  return markers.some((marker) => markerNote(marker.kind) !== null);
}
