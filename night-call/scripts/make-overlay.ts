import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

const baseComposeFiles = ['compose.yaml', 'compose.full.yaml', 'compose.observability.yaml'];

const alertingBlock = `
rule_files:
  - /etc/prometheus/rules/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
`;

function serviceNames(shopPath: string): string[] {
  const names = new Set<string>();
  for (const file of baseComposeFiles) {
    const doc = parse(readFileSync(join(shopPath, file), 'utf8')) as { services?: Record<string, unknown> };
    Object.keys(doc.services ?? {}).forEach((name) => names.add(name));
  }
  return [...names].sort();
}

function cloneServiceBlock(name: string): string {
  const lines = [`  ${name}:`, `    container_name: clone-${name}`, `    ports: !override []`];
  if (name === 'flagd') lines.push('    volumes: !override', '      - ./clone/flagd:/etc/flagd');
  if (name === 'flagd-ui') lines.push('    volumes: !override', '      - ./clone/flagd:/app/data');
  return lines.join('\n');
}

function cloneCompose(names: string[]): string {
  const header = 'networks:\n  default:\n    name: night-call-clone\n    internal: true\n\nservices:\n';
  return header + names.map(cloneServiceBlock).join('\n') + '\n';
}

function writePrometheusConfig(shopPath: string): void {
  const upstream = readFileSync(join(shopPath, 'src/prometheus/prometheus-config.yaml'), 'utf8');
  writeFileSync(join(shopPath, 'src/prometheus/prometheus-nightcall.yaml'), upstream.trimEnd() + '\n' + alertingBlock);
}

function writeCloneCompose(shopPath: string): void {
  writeFileSync(join(shopPath, 'compose.clone.yaml'), cloneCompose(serviceNames(shopPath)));
}

const shopPath = process.argv[2];
if (!shopPath) {
  console.error('usage: npm run overlay -- <path to astronomy-shop>');
  process.exit(1);
}
writePrometheusConfig(shopPath);
writeCloneCompose(shopPath);
console.log(`wrote prometheus-nightcall.yaml and compose.clone.yaml in ${shopPath}`);
