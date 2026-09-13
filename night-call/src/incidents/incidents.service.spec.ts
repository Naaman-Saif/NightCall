import { readLog } from '../investigation/event-lines';
import { readSnapshot } from '../investigation/incident-catalog';
import { incidentFolder } from '../investigation/incident-paths';
import { freshWriter } from '../investigation/writer.fixture';
import type { AlertPayload } from './alert-payload';
import { EventWriter } from '../investigation/event-writer';
import { ProductionWatch } from '../recorder/production-watch';
import { FakeSource } from '../recorder/recorder.fixture';
import { SeriesKeeper } from '../recorder/series-keeper';
import { idleSandboxOwner } from '../experiments/sandbox-owner.fixture';
import { IncidentsService } from './incidents.service';

jest.mock('../production/recipe-in-background', () => ({ captureRecipeInBackground: jest.fn() }));

function serviceFor(writer: EventWriter): IncidentsService {
  return new IncidentsService(new SeriesKeeper(writer, new ProductionWatch(new FakeSource())), idleSandboxOwner);
}

function firing(alertname: string, service: string): AlertPayload {
  return {
    status: 'firing',
    alerts: [{ status: 'firing', labels: { alertname, service }, annotations: {}, startsAt: '2026-09-13T03:14:02Z' }],
  };
}

describe('IncidentsService', () => {
  it('opens one active incident per service, whatever the alert name', async () => {
    const writer = freshWriter();
    const service = serviceFor(writer);
    expect(await service.receive(firing('RecommendationCrashed', 'recommendation'))).toEqual(['inc-001']);
    expect(await service.receive(firing('RecommendationCrashed', 'recommendation'))).toEqual([]);
    expect(await service.receive(firing('RecommendationCanaryFailing', 'recommendation'))).toEqual([]);
    expect(await service.receive(firing('PaymentErrorRateHigh', 'payment'))).toEqual(['inc-002']);
    expect(readSnapshot(writer.stateDir, 'inc-001')?.incident).toMatchObject({ service: 'recommendation', lifecycle: 'active' });
  });

  it('opens a new incident once the earlier one finished', async () => {
    const writer = freshWriter();
    const service = serviceFor(writer);
    await service.receive(firing('RecommendationRestarted', 'recommendation'));
    const draft = { actor: 'system' as const, type: 'investigation_finished' as const, summary: 'done', refs: [] };
    await writer.update('inc-001', () => ({ ...draft, payload: { reason: 'completed' } }));
    expect(await service.receive(firing('RecommendationRestarted', 'recommendation'))).toEqual(['inc-002']);
  });

  it('marks an alert labelled nightcall_test as illustrative and a real alert as not', async () => {
    const writer = freshWriter();
    const service = serviceFor(writer);
    const check = firing('AgentSliceCheck', 'recommendation');
    check.alerts[0].labels.nightcall_test = 'true';
    await service.receive(check);
    await service.receive(firing('PaymentErrorRateHigh', 'payment'));
    const alertEvent = readLog(incidentFolder(writer.stateDir, 'inc-001')).events[0];
    expect(alertEvent.payload.illustrative).toBe(true);
    expect(readSnapshot(writer.stateDir, 'inc-001')?.incident.illustrative).toBe(true);
    expect(readSnapshot(writer.stateDir, 'inc-002')?.incident.illustrative).toBe(false);
  });

  it('ignores resolved alerts', async () => {
    const service = serviceFor(freshWriter());
    const resolved = firing('RecommendationRestarted', 'recommendation');
    resolved.alerts[0].status = 'resolved';
    expect(await service.receive(resolved)).toEqual([]);
  });
});
