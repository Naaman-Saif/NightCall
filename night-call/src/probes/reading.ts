export interface ProbeReading {
  name: string;
  value: number;
  failing: boolean;
}

export type FailureSignature = Record<string, number>;

export function reading(name: string, value: number): ProbeReading {
  return { name, value, failing: false };
}

export function failed(name: string, value: number): ProbeReading {
  return { name, value, failing: true };
}

export function signatureOf(readings: ProbeReading[]): FailureSignature {
  const failing = readings.filter((r) => r.failing).sort((a, b) => a.name.localeCompare(b.name));
  return Object.fromEntries(failing.map((r) => [r.name, r.value]));
}

export function signaturesMatch(a: FailureSignature, b: FailureSignature): boolean {
  const namesA = Object.keys(a).sort().join(',');
  const namesB = Object.keys(b).sort().join(',');
  return namesA === namesB;
}

export function signatureIsGreen(signature: FailureSignature): boolean {
  return Object.keys(signature).length === 0;
}
