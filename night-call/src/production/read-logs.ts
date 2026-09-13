import { docker } from '../config/docker';
import { demuxDockerLog } from '../evidence/logs';
import { withTimeout } from '../recorder/with-timeout';
import { excerptOf, momentMinutesAgo, type Reading } from './reading';

export type LogsQuery = { service: string; minutes: number; tail: number };

const LOGS_TIMEOUT_MS = 10_000;

export async function readProductionLogs(query: LogsQuery): Promise<Reading> {
  const since = Math.floor(momentMinutesAgo(query.minutes) / 1000);
  const options = { stdout: true, stderr: true, since, tail: query.tail, timestamps: true, follow: false as const };
  const raw = await withTimeout(docker.getContainer(query.service).logs(options), LOGS_TIMEOUT_MS);
  const lines = demuxDockerLog(raw).split('\n').filter((line) => line.trim() !== '');
  const summary = `${lines.length} log lines from ${query.service} in the last ${query.minutes} minutes`;
  const exactSource = { kind: 'stored_excerpt' as const };
  return { kind: 'logs', source: `docker logs: ${query.service}`, summary, excerpt: excerptOf(lines), data: { lines }, exactSource };
}
