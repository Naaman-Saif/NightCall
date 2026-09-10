import { docker } from '../config/docker';
import { containerNameFor, type StackTarget } from '../config/targets';

const tailLines = 200;
const frameHeaderBytes = 8;

export function demuxDockerLog(buffer: Buffer): string {
  const parts: string[] = [];
  let offset = 0;
  while (offset + frameHeaderBytes <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    parts.push(buffer.subarray(offset + frameHeaderBytes, offset + frameHeaderBytes + size).toString('utf8'));
    offset += frameHeaderBytes + size;
  }
  return parts.join('');
}

export async function recentLogs(target: StackTarget, service: string): Promise<string[]> {
  const container = docker.getContainer(containerNameFor(target, service));
  const raw = (await container.logs({ stdout: true, stderr: true, tail: tailLines, timestamps: true })) as unknown as Buffer;
  return demuxDockerLog(raw).split('\n').filter((line) => line.trim().length > 0);
}
