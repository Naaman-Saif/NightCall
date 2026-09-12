let interruptReason: string | null = null;

export function requestInterrupt(reason: string): void {
  interruptReason = interruptReason ?? reason;
}

export function requireNotInterrupted(): void {
  if (interruptReason) throw new Error(`sandbox interrupted: ${interruptReason}`);
}
