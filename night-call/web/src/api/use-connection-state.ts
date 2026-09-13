import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'stale';

export const STALE_AFTER_MS = 20_000;

export function useConnectionState() {
  const [state, setState] = useState<ConnectionState>('connecting');
  const staleTimer = useRef<number | undefined>(undefined);

  const markOpen = useCallback(() => {
    window.clearTimeout(staleTimer.current);
    staleTimer.current = undefined;
    setState('live');
  }, []);

  const markLost = useCallback(() => {
    setState((current) => (current === 'stale' ? 'stale' : 'reconnecting'));
    if (staleTimer.current !== undefined) return;
    staleTimer.current = window.setTimeout(() => setState('stale'), STALE_AFTER_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(staleTimer.current), []);

  return { state, markOpen, markLost };
}
