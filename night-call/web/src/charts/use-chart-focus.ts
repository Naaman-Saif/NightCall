import { useCallback, useState, type Dispatch, type KeyboardEvent, type PointerEvent, type SetStateAction } from 'react';
import { nearestIndex, timeAtX, type TimeScale } from './chart-geometry';

export type ChartFocus = { kind: 'sample'; index: number } | { kind: 'marker'; index: number } | null;

type FocusInput = { sampleTimes: number[]; scale: TimeScale | null };
type KeyInput = { current: ChartFocus; key: string; count: number };

const KEY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
const FOCUS_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'];

export function focusAfterKey({ current, key, count }: KeyInput): ChartFocus {
  if (count === 0 || key === 'Escape') return null;
  if (key === 'Home') return { kind: 'sample', index: 0 };
  if (key === 'End') return { kind: 'sample', index: count - 1 };
  const step = KEY_STEPS[key];
  if (step === undefined) return current;
  const index = current?.kind === 'sample' ? current.index : count - 1;
  return { kind: 'sample', index: Math.min(count - 1, Math.max(0, index + step)) };
}

export function useChartFocus({ sampleTimes, scale }: FocusInput) {
  const [focus, setFocus] = useState<ChartFocus>(null);
  const focusNearestSample = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!scale || sampleTimes.length === 0) return;
      const time = timeAtX(scale, event.clientX - event.currentTarget.getBoundingClientRect().left);
      setFocus({ kind: 'sample', index: nearestIndex(sampleTimes, time) });
    },
    [sampleTimes, scale],
  );
  const focusMarker = useCallback((index: number | null) => setFocus(index === null ? null : { kind: 'marker', index }), []);
  const plotHandlers = { onPointerMove: focusNearestSample, onPointerDown: focusNearestSample, ...keyHandlers(setFocus, sampleTimes.length) };
  return { focus, focusMarker, plotHandlers };
}

function keyHandlers(setFocus: Dispatch<SetStateAction<ChartFocus>>, count: number) {
  return {
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (FOCUS_KEYS.includes(event.key)) event.preventDefault();
      setFocus((current) => focusAfterKey({ current, key: event.key, count }));
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') setFocus(null);
    },
    onFocus: () => setFocus((current) => current ?? focusAfterKey({ current, key: 'End', count })),
  };
}

export type ChartFocusState = ReturnType<typeof useChartFocus>;
