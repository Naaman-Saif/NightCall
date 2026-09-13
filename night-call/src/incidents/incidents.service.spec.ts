import { readSnapshot } from '../investigation/incident-catalog';
import { freshWriter } from '../investigation/writer.fixture';
import type { AlertPayload } from './alert-payload';
import { EventWriter } from '../investigation/event-writer';
import { ProductionWatch } from '../recorder/production-watch';
import { FakeSource } from '../recorder/recorder.fixture';
import { SeriesKeeper } from '../recorder/series-keeper';
import { IncidentsService } from './incidents.service';

function serviceFor(writer: EventWriter): IncidentsService {
  return new IncidentsService(new SeriesKeeper(writer, new ProductionWatch(new FakeSource())));
}

function firing(alertname: string, service: string): AlertPayload {
  return {
    status: 'firing',
    alerts: [{ status: 'firing', labels: { alertname, service }, annotations: {}, startsAt: '2026-09-13T03:14:02Z' }],
  };
}

describe('IncidentsService', () => {
  it('opens one active incident per service and alert name', async () => {
    const writer = freshWriter();
    const service = serviceFor(writer);
    expect(await service.receive(firing('RecommendationRestarted', 'recommendation'))).toEqual(['inc-001']);
    expect(await service.receive(firing('RecommendationRestarted', 'recommendation'))).toEqual([]);
    expect(await service.receive(firing('RecommendationFailing', 'recommendation'))).toEqual(['inc-002']);
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

  it('ignores resolved alerts', async () => {
    const service = serviceFor(freshWriter());
    const resolved = firing('RecommendationRestarted', 'recommendation');
    resolved.alerts[0].status = 'resolved';
    expect(await service.receive(resolved)).toEqual([]);
  });
});
