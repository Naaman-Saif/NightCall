import { resolve } from 'node:path';

import type { ComposeMount } from './copy-mount';
import { sandboxContainerName, sandboxNetwork } from './constants';
import type { ComposeDocument, ComposeService } from './production-compose';
import { isInside } from './run-files';
import { requireSandboxProject } from './write-guard';

export interface IsolationCheck {
  document: ComposeDocument;
  runFolder: string;
}

interface ServiceCheck {
  name: string;
  service: ComposeService;
  runFolder: string;
}

const forbiddenTargets = ['/hostfs', '/var/run/docker.sock'];

function requireRule(passed: boolean, message: string): void {
  if (!passed) throw new Error(`isolation rule broken: ${message}`);
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return true;
  return typeof value === 'object' && Object.keys(value).length === 0;
}

function checkMount(mount: ComposeMount, runFolder: string): void {
  const source = resolve(mount.source ?? '');
  const forbidden = forbiddenTargets.some((target) => mount.target === target || mount.target.startsWith(`${target}/`));
  requireRule(mount.type === 'bind' && mount.read_only === true, `${mount.target} must be a read-only bind`);
  requireRule(isInside(source, runFolder), `${source} is outside the run folder`);
  requireRule(!forbidden, `${mount.target} is a host target`);
}

function checkService(check: ServiceCheck): void {
  const { name, service } = check;
  requireRule(service.container_name === sandboxContainerName(name), `${name} container name`);
  requireRule(isEmpty(service.ports) && isEmpty(service.network_mode), `${name} publishes ports or sets a network mode`);
  requireRule(isEmpty(service.privileged) && isEmpty(service.pid), `${name} is privileged or shares pid`);
  requireRule(JSON.stringify(service.networks) === '{"default":null}', `${name} joins other networks`);
  for (const mount of (service.volumes ?? []) as ComposeMount[]) checkMount(mount, check.runFolder);
}

function checkNetwork(document: ComposeDocument): void {
  const networks = (document.networks ?? {}) as Record<string, { name?: string; internal?: boolean }>;
  const network = networks.default;
  requireRule(Object.keys(networks).join() === 'default', 'only the default network may exist');
  requireRule(network?.internal === true && network.name === sandboxNetwork, 'default network must be internal and named');
  requireRule(isEmpty(document.volumes), 'top-level volumes are not allowed');
}

export function validateSandboxCompose(check: IsolationCheck): void {
  requireSandboxProject(String(check.document.name));
  for (const [name, service] of Object.entries(check.document.services)) {
    checkService({ name, service, runFolder: check.runFolder });
  }
  checkNetwork(check.document);
}
