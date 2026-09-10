import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AlertPayload } from './alert-payload';
import { IncidentStore } from './incident-store';
import { IncidentsService } from './incidents.service';

function firing(alertname: string, service: string): AlertPayload {
  return {
    status: 'firing',
    alerts: [{ status: 'firing', labels: { alertname, service }, annotations: {}, startsAt: '2026-09-11T03:14:02Z' }],
  };
}

function freshService(): IncidentsService {
  const dir = mkdtempSync(join(tmpdir(), 'night-call-'));
  return new IncidentsService(new IncidentStore(join(dir, 'incidents.json')));
}

describe('IncidentsService', () => {
  it('opens one incident per service and alertname while one is open', () => {
    const service = freshService();
    expect(service.receive(firing('PaymentErrorRateHigh', 'payment'))).toHaveLength(1);
    expect(service.receive(firing('PaymentErrorRateHigh', 'payment'))).toHaveLength(0);
    expect(service.receive(firing('AdServiceCpuHigh', 'ad'))).toHaveLength(1);
  });

  it('opens a new incident for the same key once the previous one is closed', () => {
    const service = freshService();
    const [first] = service.receive(firing('PaymentErrorRateHigh', 'payment'));
    service.setStatus(first.id, 'closed');
    expect(service.receive(firing('PaymentErrorRateHigh', 'payment'))).toHaveLength(1);
  });

  it('ignores resolved alerts', () => {
    const service = freshService();
    const resolved: AlertPayload = { ...firing('PaymentErrorRateHigh', 'payment'), status: 'resolved' };
    resolved.alerts[0].status = 'resolved';
    expect(service.receive(resolved)).toHaveLength(0);
  });
});
