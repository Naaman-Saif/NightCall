import { Injectable } from '@nestjs/common';

import { watchedServices, type StackTarget } from '../config/targets';
import { containerReading, cpuReading } from './container-probe';
import { checkoutProbe, frontendProbe } from './http-probe';
import { metricProbes, metricReading } from './metrics-probe';
import { failed, signatureOf, type FailureSignature, type ProbeReading } from './reading';

function settle(name: string, promise: Promise<ProbeReading>): Promise<ProbeReading> {
  return promise.catch(() => failed(name, -1));
}

@Injectable()
export class ProbesService {
  async readAll(target: StackTarget): Promise<ProbeReading[]> {
    const http = [settle('frontend_http_status', frontendProbe(target)), settle('checkout_http_status', checkoutProbe(target))];
    const metrics = metricProbes.map((probe) => settle(probe.name, metricReading(target, probe)));
    const containers = watchedServices.map((service) => settle(`container_${service}`, containerReading(target, service)));
    const cpu = [settle('cpu_ad', cpuReading(target, 'ad'))];
    return Promise.all([...http, ...metrics, ...containers, ...cpu]);
  }

  async signature(target: StackTarget): Promise<FailureSignature> {
    return signatureOf(await this.readAll(target));
  }
}
