import { chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const collectorYaml = `receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
processors:
  batch:
    timeout: 1s
exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  debug:
    verbosity: basic
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
`;

export function writeCollectorConfig(runFolder: string): string {
  const path = join(runFolder, 'collector.yml');
  writeFileSync(path, collectorYaml);
  chmodSync(path, 0o644);
  return path;
}
