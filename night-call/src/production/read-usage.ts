import type { SeriesSample } from '../recorder/series-sample';
import type { ServiceTracks } from '../recorder/service-tracks';
import { COMPARE_LINK_LABEL } from './exact-source';
import { excerptOf, type Reading } from './reading';
import { grafanaExploreLink, rangeOfMinutes, type SourceLink, type TimeRange } from './source-links';

export type UsageQuery = { service: string; minutes: number; measure: 'memory' | 'cpu' };

const MEBIBYTE = 1024 * 1024;

function valueOf(sample: SeriesSample, measure: UsageQuery['measure']): number | null {
  return measure === 'memory' ? sample.memoryBytes : sample.cpuPercent;
}

function formatted(value: number | null, measure: UsageQuery['measure']): string {
  if (value === null) return 'unknown';
  return measure === 'memory' ? `${Math.round(value / MEBIBYTE)} MiB` : `${value.toFixed(1)}%`;
}

function summaryOf(query: UsageQuery, samples: SeriesSample[]): string {
  const values = samples.map((sample) => valueOf(sample, query.measure)).filter((value): value is number => value !== null);
  const peak = values.length > 0 ? Math.max(...values) : null;
  const latest = formatted(values.at(-1) ?? null, query.measure);
  const limit = samples.at(-1)?.limitBytes ?? null;
  const limitText = query.measure === 'memory' ? `, limit ${limit === null ? 'none' : formatted(limit, 'memory')}` : '';
  const counted = `${samples.length} samples over ${query.minutes} minutes`;
  return `${query.service} ${query.measure} latest ${latest}, peak ${formatted(peak, query.measure)}${limitText} (${counted})`;
}

function compareLink(query: UsageQuery, range: TimeRange): SourceLink {
  const metric = query.measure === 'memory' ? 'container_memory_usage_total_bytes' : 'container_cpu_utilization_ratio';
  return grafanaExploreLink({ label: COMPARE_LINK_LABEL, expr: `${metric}{container_name="${query.service}"}` }, range);
}

export function readUsage(tracks: ServiceTracks, query: UsageQuery): Reading {
  const range = rangeOfMinutes(query.minutes);
  const cutoff = new Date(range.fromMs).toISOString();
  const samples = tracks.windowOf(query.service).filter((sample) => sample.at >= cutoff);
  const lines = samples.map((sample) => `${sample.at} ${formatted(valueOf(sample, query.measure), query.measure)}`);
  const kind = query.measure === 'memory' ? 'memory' : 'cpu';
  const data = { limitBytes: samples.at(-1)?.limitBytes ?? null, samples };
  const exactSource = { kind: 'recorder' as const, service: query.service, range };
  const reading = { kind, source: `recorder: ${query.service}`, summary: summaryOf(query, samples), excerpt: excerptOf(lines), data } as const;
  return { ...reading, exactSource, sourceLinks: [compareLink(query, range)] };
}
