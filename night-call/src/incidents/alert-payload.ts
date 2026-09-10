import { z } from 'zod';

const alertSchema = z.object({
  status: z.enum(['firing', 'resolved']),
  labels: z.record(z.string(), z.string()),
  annotations: z.record(z.string(), z.string()).default({}),
  startsAt: z.string(),
  fingerprint: z.string().optional(),
});

export const alertPayloadSchema = z.object({
  status: z.enum(['firing', 'resolved']),
  receiver: z.string().optional(),
  alerts: z.array(alertSchema),
});

export type Alert = z.infer<typeof alertSchema>;
export type AlertPayload = z.infer<typeof alertPayloadSchema>;

export function alertIsFiring(alert: Alert): boolean {
  return alert.status === 'firing';
}

export function alertNameOf(alert: Alert): string {
  return alert.labels.alertname ?? 'unknown';
}

export function serviceOf(alert: Alert): string {
  return alert.labels.service ?? alert.labels.service_name ?? 'unknown';
}
