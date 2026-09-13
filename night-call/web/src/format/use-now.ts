import { useEffect, useState } from 'react';

const TICK_EVERY_MS = 1_000;

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
