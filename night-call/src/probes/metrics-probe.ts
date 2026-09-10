import { urlFor } from '../config/hosts';
import type { StackTarget } from '../config/targets';
import { failed, reading, type ProbeReading } from './reading';

interface MetricProbe {
  name: string;
  query: string;
  ceiling: number;
}

export const metricProbes: MetricProbe[] = [
  {
    name: 'payment_error_rate',
    query: 'sum(rate(traces_span_metrics_calls_total{service_name="payment",status_code="STATUS_CODE_ERROR"}[2m])) / sum(rate(traces_span_metrics_calls_total{service_name="payment"}[2m]))',
    ceiling: 0.2,
  },
  { name: 'kafka_consumer_lag', query: 'max(kafka_consumer_group_lag_ratio or kafka_consumer_group_lag)', ceiling: 500 },
];

export async function instantValue(target: StackTarget, query: string): Promise<number> {
  const url = `${await urlFor(target, 'prometheus')}/api/v1/query?query=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`prometheus ${response.status}`);
  const body = (await response.json()) as { data: { result: { value: [number, string] }[] } };
  const first = body.data.result[0];
  return first ? Number(first.value[1]) : 0;
}

export async function metricReading(target: StackTarget, probe: MetricProbe): Promise<ProbeReading> {
  const value = await instantValue(target, probe.query);
  const rounded = Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
  return rounded > probe.ceiling ? failed(probe.name, rounded) : reading(probe.name, rounded);
}
