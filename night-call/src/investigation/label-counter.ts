import { allSnapshots } from './incident-catalog';

function labelNumber(label: string): number {
  const digits = /^INC-(\d+)$/.exec(label)?.[1];
  return digits ? Number(digits) : 0;
}

export function nextLabel(stateDir: string): string {
  const highest = Math.max(0, ...allSnapshots(stateDir).map((snapshot) => labelNumber(snapshot.incident.label)));
  return `INC-${String(highest + 1).padStart(3, '0')}`;
}
