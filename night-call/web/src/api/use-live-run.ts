import { useEffect, useState } from 'react';
import { readJson } from './client';
import type { LiveRun } from './live-run';

export const POLL_LIVE_RUN_EVERY_MS = 3_000;

export function useLiveRun(livePath: string | null): LiveRun | null {
  const [live, setLive] = useState<{ path: string; run: LiveRun } | null>(null);
  useEffect(() => {
    if (!livePath) return undefined;
    const read = () =>
      fetch(livePath)
        .then((response) => readJson<LiveRun>(response))
        .then((run) => setLive({ path: livePath, run }), () => undefined);
    read();
    const timer = window.setInterval(read, POLL_LIVE_RUN_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [livePath]);
  return live && live.path === livePath ? live.run : null;
}
