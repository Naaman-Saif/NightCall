import type { ComposeService } from './production-compose';

type Resources = { limits?: Record<string, unknown> } & Record<string, unknown>;
type Deploy = { resources?: Resources } & Record<string, unknown>;

export function withProductionMemoryLimit(service: ComposeService, limitBytes: number): ComposeService {
  const deploy = (service.deploy ?? {}) as Deploy;
  const resources = deploy.resources ?? {};
  const limits = { ...(resources.limits ?? {}) };
  delete limits.memory;
  if (limitBytes > 0) limits.memory = String(limitBytes);
  const changed: ComposeService = { ...service, deploy: { ...deploy, resources: { ...resources, limits } } };
  delete changed.mem_limit;
  return changed;
}
