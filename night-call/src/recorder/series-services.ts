export const PRODUCTION_SERVICES = [
  'accounting', 'ad', 'alertmanager', 'astronomy-db', 'cart', 'checkout', 'currency', 'email', 'flagd',
  'flagd-ui', 'fraud-detection', 'frontend', 'frontend-proxy', 'grafana', 'image-provider', 'jaeger', 'kafka',
  'load-generator', 'night-call', 'opamp-server', 'opensearch', 'otel-collector', 'payment', 'product-catalog',
  'prometheus', 'quote', 'recommendation', 'shipping', 'status', 'telemetry-docs', 'valkey-cart',
] as const;

const directCallers: Record<string, string[]> = { recommendation: ['frontend'] };

export function seriesServicesFor(service: string): string[] {
  return [service, ...(directCallers[service] ?? [])];
}
