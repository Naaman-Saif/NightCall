let stopReason: string | null = null;

export function requestStop(reason: string): void {
  stopReason = stopReason ?? reason;
}

export function requireNoStopRequest(): void {
  if (stopReason) throw new Error(`sandbox stop requested: ${stopReason}`);
}
