import { join } from 'node:path';

import { writeCollectorConfig } from './collector-config';
import type { ComposeMount } from './copy-mount';
import { collectorConfigTarget, excludedServices, sandboxNetwork, sandboxProject } from './constants';
import { isolateService, type ServiceIdentity } from './isolate-service';
import { validateSandboxCompose } from './isolation-rules';
import { renderProductionCompose, type ComposeDocument } from './production-compose';
import { writeJson } from './run-files';

type Identities = Record<string, ServiceIdentity>;

function keepSandboxServices(document: ComposeDocument): void {
  const kept = Object.entries(document.services).filter(([name]) => !excludedServices.has(name));
  document.services = Object.fromEntries(kept);
}

function prepareCollector(document: ComposeDocument): void {
  const collector = document.services['otel-collector'];
  if (!collector) throw new Error('production compose has no otel-collector service');
  collector.volumes = [];
  collector.command = [`--config=${collectorConfigTarget}`];
  collector.depends_on = { jaeger: { condition: 'service_started' } };
}

async function isolateAll(document: ComposeDocument, runFolder: string): Promise<Identities> {
  const identities: Identities = {};
  for (const [name, service] of Object.entries(document.services)) {
    identities[name] = await isolateService({ name, service, runFolder });
  }
  return identities;
}

function bindCollector(document: ComposeDocument, runFolder: string): void {
  const source = writeCollectorConfig(runFolder);
  const mount: ComposeMount = { type: 'bind', source, target: collectorConfigTarget, read_only: true };
  document.services['otel-collector'].volumes = [mount];
}

function readOnlyBinds(document: ComposeDocument): string[] {
  const mounts = Object.values(document.services).flatMap((service) => (service.volumes ?? []) as ComposeMount[]);
  return mounts.map((mount) => `${mount.source}:${mount.target}:ro`);
}

function writeRecords(document: ComposeDocument, runFolder: string): void {
  writeJson(join(runFolder, 'compose.json'), document);
  const binds = readOnlyBinds(document);
  const record = { validated: true, project: sandboxProject, internalNetwork: sandboxNetwork, publishedPorts: [], readOnlyBinds: binds };
  writeJson(join(runFolder, 'isolation.json'), record);
}

export async function buildSandboxCompose(runFolder: string): Promise<Identities> {
  const document = await renderProductionCompose();
  document.name = sandboxProject;
  keepSandboxServices(document);
  prepareCollector(document);
  const identities = await isolateAll(document, runFolder);
  bindCollector(document, runFolder);
  document.networks = { default: { name: sandboxNetwork, driver: 'bridge', internal: true } };
  validateSandboxCompose({ document, runFolder });
  writeRecords(document, runFolder);
  writeJson(join(runFolder, 'images.json'), identities);
  return identities;
}
