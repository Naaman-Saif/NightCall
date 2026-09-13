import type { Series, SeriesSample } from '../api/series';
import {
  CONFIG_CHANGE_BEFORE_ALARM_MS, CRASH_BEFORE_ALARM_MS, RESTART_BEFORE_ALARM_MS,
  SAMPLE_STEP_MS, SAMPLE_WINDOW_BEFORE_ALARM_MS, isoAt, type SampleTimeline,
} from './sample-timeline';

const BYTES_PER_MIB = 1024 * 1024;
const SAMPLE_LIMIT_MIB = 500;
const HEALTHY_MEMORY_MIB = 45;
const MEMORY_BEFORE_CRASH_MIB = 490;
const HEALTHY_CPU_PERCENT = 14;
const STRAINED_CPU_PERCENT = 86;
const CPU_STRAIN_BEFORE_CRASH_MS = 60_000;

function memoryMibAt(sinceAlarm: number): number {
  if (sinceAlarm >= -RESTART_BEFORE_ALARM_MS) return HEALTHY_MEMORY_MIB + 3;
  if (sinceAlarm <= -CONFIG_CHANGE_BEFORE_ALARM_MS) return HEALTHY_MEMORY_MIB;
  const growthWindow = CONFIG_CHANGE_BEFORE_ALARM_MS - CRASH_BEFORE_ALARM_MS;
  const progress = Math.min(1, (sinceAlarm + CONFIG_CHANGE_BEFORE_ALARM_MS) / growthWindow);
  return HEALTHY_MEMORY_MIB + progress * (MEMORY_BEFORE_CRASH_MIB - HEALTHY_MEMORY_MIB);
}

function cpuPercentAt(sinceAlarm: number): number {
  const strainStart = -CRASH_BEFORE_ALARM_MS - CPU_STRAIN_BEFORE_CRASH_MS;
  const isStrained = sinceAlarm > strainStart && sinceAlarm <= -CRASH_BEFORE_ALARM_MS;
  return isStrained ? STRAINED_CPU_PERCENT : HEALTHY_CPU_PERCENT;
}

function sampleAt(timeline: SampleTimeline, time: number): SeriesSample {
  const sinceAlarm = time - timeline.alarmAt;
  const isContainerDown = sinceAlarm > -CRASH_BEFORE_ALARM_MS && sinceAlarm < -RESTART_BEFORE_ALARM_MS;
  if (isContainerDown) return { at: isoAt(time), memoryBytes: null, cpuPercent: null };
  const wobble = Math.sin(time / 37_000) * 2;
  const memoryBytes = Math.round((memoryMibAt(sinceAlarm) + wobble) * BYTES_PER_MIB);
  return { at: isoAt(time), memoryBytes, cpuPercent: Math.max(0, cpuPercentAt(sinceAlarm) + wobble) };
}

export function sampleSeries(timeline: SampleTimeline): Series {
  const firstAt = timeline.alarmAt - SAMPLE_WINDOW_BEFORE_ALARM_MS;
  const count = Math.floor((timeline.endAt - firstAt) / SAMPLE_STEP_MS) + 1;
  const samples = Array.from({ length: count }, (_, index) => sampleAt(timeline, firstAt + index * SAMPLE_STEP_MS));
  return { service: 'recommendation', limitBytes: SAMPLE_LIMIT_MIB * BYTES_PER_MIB, samples };
}
