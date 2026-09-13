import { closeSync, existsSync, openSync, readSync, statSync } from 'node:fs';

import type { WorkloadSample } from '../sandbox-copy/stop-rules';

export type SampleFollower = { readNew(finished?: boolean): WorkloadSample[] };

function sampleOf(line: string): WorkloadSample | null {
  try {
    const value = JSON.parse(line) as WorkloadSample;
    return typeof value?.index === 'number' ? value : null;
  } catch {
    return null;
  }
}

function readFrom(path: string, offset: number): { text: string; size: number } {
  const size = statSync(path).size;
  if (size <= offset) return { text: '', size: offset };
  const buffer = Buffer.alloc(size - offset);
  const descriptor = openSync(path, 'r');
  readSync(descriptor, buffer, 0, buffer.length, offset);
  closeSync(descriptor);
  return { text: buffer.toString('utf8'), size };
}

export function followSamples(path: string): SampleFollower {
  let offset = 0;
  let partial = '';
  const readNew = (finished = false): WorkloadSample[] => {
    if (!existsSync(path)) return [];
    const chunk = readFrom(path, offset);
    offset = chunk.size;
    const lines = (partial + chunk.text).split('\n');
    partial = finished ? '' : (lines.pop() ?? '');
    return lines.map(sampleOf).filter((sample): sample is WorkloadSample => sample !== null);
  };
  return { readNew };
}
