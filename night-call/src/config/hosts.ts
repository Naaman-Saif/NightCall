import { docker } from './docker';
import { containerNameFor, targetIsProduction, type StackTarget } from './targets';

const servicePorts: Record<string, number> = { prometheus: 9090, jaeger: 16686, 'frontend-proxy': 8080 };
const cacheMs = 20 * 1000;
const cache = new Map<string, { ip: string; at: number }>();

async function containerIp(name: string): Promise<string> {
  const info = await docker.getContainer(name).inspect();
  const networks = Object.values(info.NetworkSettings?.Networks ?? {});
  const ip = networks.map((n) => n.IPAddress).find((address) => address);
  if (!ip) throw new Error(`no ip for ${name}`);
  return ip;
}

async function hostFor(target: StackTarget, service: string): Promise<string> {
  const name = containerNameFor(target, service);
  const cached = cache.get(name);
  if (cached && Date.now() - cached.at < cacheMs) return cached.ip;
  const ip = await containerIp(name).catch(() => (targetIsProduction(target) ? service : name));
  cache.set(name, { ip, at: Date.now() });
  return ip;
}

export async function urlFor(target: StackTarget, service: string): Promise<string> {
  return `http://${await hostFor(target, service)}:${servicePorts[service]}`;
}
