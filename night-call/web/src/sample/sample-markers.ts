import type { IncidentEvent } from '../api/contract';
import type { ChartData } from '../api/use-chart-data';
import type { IncidentMarker, MarkerKind } from '../api/markers';
import { sampleSeries } from './sample-series';
import {
  CONFIG_CHANGE_BEFORE_ALARM_MS, CRASH_BEFORE_ALARM_MS, RESTART_BEFORE_ALARM_MS,
  isoAt, sampleTimelineOf, type SampleTimeline,
} from './sample-timeline';

type MarkerDraft = { time: number; kind: MarkerKind; label: string; ref: string | null };

function evidenceMarkers(event: IncidentEvent<'evidence_recorded'>, timeline: SampleTimeline): MarkerDraft[] {
  const ref = event.payload.evidenceId;
  if (event.payload.kind === 'deploy_history') {
    return [{ time: timeline.alarmAt - CONFIG_CHANGE_BEFORE_ALARM_MS, kind: 'config_change', label: event.summary, ref }];
  }
  if (event.payload.kind !== 'oom_events') return [];
  return [
    { time: timeline.alarmAt - CRASH_BEFORE_ALARM_MS, kind: 'crash', label: 'recommendation ran out of memory and was killed', ref },
    { time: timeline.alarmAt - RESTART_BEFORE_ALARM_MS, kind: 'restart', label: 'recommendation restarted', ref },
  ];
}

function proofMarkers(event: IncidentEvent): MarkerDraft[] {
  const time = Date.parse(event.occurredAt);
  if (event.type === 'verification_reviewed' && event.payload.approved) {
    return [{ time, kind: 'fix_verified', label: 'Fix verified in the sandbox, 3 of 3 rounds', ref: event.id }];
  }
  if (event.type === 'publication_changed' && event.payload.state === 'published') {
    return [{ time, kind: 'pr_opened', label: `Pull request #${event.payload.number} opened`, ref: event.id }];
  }
  return [];
}

function markersForEvent(event: IncidentEvent, timeline: SampleTimeline): MarkerDraft[] {
  if (event.type === 'alert_received') {
    return [{ time: timeline.alarmAt, kind: 'alarm', label: `Alarm fired: ${event.payload.alertName}`, ref: event.id }];
  }
  if (event.type === 'evidence_recorded') return evidenceMarkers(event, timeline);
  if (event.type === 'context_supplied') {
    const label = `Operator answered: ${event.payload.text}`;
    return [{ time: Date.parse(event.occurredAt), kind: 'operator_answer', label, ref: event.id }];
  }
  return proofMarkers(event);
}

function markerOf(draft: MarkerDraft): IncidentMarker {
  return { at: isoAt(draft.time), kind: draft.kind, label: draft.label, ref: draft.ref };
}

export function sampleChartData(events: IncidentEvent[]): ChartData {
  const timeline = sampleTimelineOf(events);
  if (!timeline) return { series: null, markers: [], isLoading: true, isMarkersAvailable: false };
  const markers = events.flatMap((event) => markersForEvent(event, timeline)).map(markerOf);
  return { series: sampleSeries(timeline), markers, isLoading: false, isMarkersAvailable: true };
}
