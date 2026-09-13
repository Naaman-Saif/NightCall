import { copyMount, type ComposeMount } from './copy-mount';
import { sandboxContainerName } from './constants';
import { inspectContainer } from './docker-api';
import { withProductionMemoryLimit } from './memory-limit-compose';
import type { ComposeService } from './production-compose';

export interface ServiceToIsolate {
  name: string;
  service: ComposeService;
  runFolder: string;
}

export interface ServiceIdentity {
  image: string;
  memoryLimit: number;
}

const droppedKeys = ['build', 'develop', 'profiles'];

export async function isolateService(input: ServiceToIsolate): Promise<ServiceIdentity> {
  const production = await inspectContainer(input.name);
  const service = input.service;
  const mounts = (service.volumes ?? []) as ComposeMount[];
  service.image = production.Image;
  service.container_name = sandboxContainerName(input.name);
  service.ports = [];
  service.networks = { default: null };
  service.volumes = mounts.map((mount) => copyMount({ mount, runFolder: input.runFolder }));
  for (const key of droppedKeys) delete service[key];
  const memoryLimit = production.HostConfig.Memory ?? 0;
  service.deploy = withProductionMemoryLimit(service, memoryLimit).deploy;
  delete service.mem_limit;
  return { image: production.Image, memoryLimit };
}
