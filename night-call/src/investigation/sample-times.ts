import type { EventDraft } from './event-types';

export type ReplayClock = { fixtureAlertAt: string; replayAlertAt: string };

type TimeShift = (iso: string) => string;

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const MINUTE_MS = 60_000;
export const DEPLOY_MINUTES_BEFORE_ALERT = 12;
export const EVIDENCE_MINUTES_BEFORE_ALERT = 5;

export function shiftedTimes(value: unknown, shift: TimeShift): unknown {
  if (typeof value === 'string') return ISO_TIME.test(value) ? shift(value) : value;
  if (Array.isArray(value)) return value.map((item) => shiftedTimes(item, shift));
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shiftedTimes(item, shift)]));
}

function minutesBeforeAlert(draft: EventDraft, evidencePosition: number): number {
  if (draft.payload.kind === 'deploy_history') return DEPLOY_MINUTES_BEFORE_ALERT;
  return Math.max(1, EVIDENCE_MINUTES_BEFORE_ALERT - evidencePosition);
}

function evidencePositions(drafts: EventDraft[]): Map<EventDraft, number> {
  const evidence = drafts.filter((draft) => draft.type === 'evidence_recorded');
  return new Map(evidence.map((draft, position) => [draft, position]));
}

export function retimedDrafts<Draft extends EventDraft>(drafts: Draft[], clock: ReplayClock): Draft[] {
  const alertMs = Date.parse(clock.replayAlertAt);
  const offsetMs = alertMs - Date.parse(clock.fixtureAlertAt);
  const shift: TimeShift = (iso) => new Date(Date.parse(iso) + offsetMs).toISOString();
  const positions = evidencePositions(drafts);
  return drafts.map((draft) => {
    const payload = shiftedTimes(draft.payload, shift) as Record<string, unknown>;
    const position = positions.get(draft);
    if (position === undefined) return { ...draft, payload };
    const observedAt = new Date(alertMs - minutesBeforeAlert(draft, position) * MINUTE_MS).toISOString();
    return { ...draft, payload: { ...payload, observedAt } };
  });
}
