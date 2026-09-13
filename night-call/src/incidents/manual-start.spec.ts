import { BadRequestException, ConflictException } from '@nestjs/common';

import { readLog } from '../investigation/event-lines';
import type { EventWriter } from '../investigation/event-writer';
import { readSnapshot } from '../investigation/incident-catalog';
import { incidentFolder } from '../investigation/incident-paths';
import { openInvestigation } from '../investigation/open-investigation';
import { freshWriter } from '../investigation/writer.fixture';
import { ProductionWatch } from '../recorder/production-watch';
import { FakeSource } from '../recorder/recorder.fixture';
import { SeriesKeeper } from '../recorder/series-keeper';
import { invokeAgents } from '../runtime/runtime-invoker';
import { manualFacts, ManualStartService } from './manual-start.service';

jest.mock('../runtime/runtime-invoker', () => ({
  invokeAgents: jest.fn().mockResolvedValue({ runtimeSessionId: 's', statusCode: 200, reply: '', elapsedMs: 1 }),
}));

function starterFor(writer: EventWriter): ManualStartService {
  return new ManualStartService(new SeriesKeeper(writer, new ProductionWatch(new FakeSource())));
}

describe('manual investigation start', () => {
  beforeEach(() => jest.mocked(invokeAgents).mockClear());

  it('opens a real manual incident with a 30 minute deadline and invokes the agents', async () => {
    const writer = freshWriter();
    expect(await starterFor(writer).start({ service: 'recommendation' })).toEqual({ incidentId: 'inc-001', label: 'INC-001' });
    const alert = readLog(incidentFolder(writer.stateDir, 'inc-001')).events[0];
    expect(alert.payload).toMatchObject({ alertName: 'Manually triggered', severity: 'manual', labels: { trigger: 'manual', service: 'recommendation' } });
    expect(alert.payload.illustrative).toBeUndefined();
    const incident = readSnapshot(writer.stateDir, 'inc-001')?.incident;
    expect(incident).toMatchObject({ alertName: 'Manually triggered', illustrative: false, lifecycle: 'active' });
    expect(Date.parse(String(incident?.deadlineAt)) - Date.parse(String(incident?.startedAt))).toBe(30 * 60_000);
    expect(invokeAgents).toHaveBeenCalledWith({ incidentId: 'inc-001', mode: 'investigate' });
  });

  it('refuses a second start while a real incident is active, but never because of a test incident', async () => {
    const writer = freshWriter();
    const starter = starterFor(writer);
    await openInvestigation(writer, { facts: { ...manualFacts('recommendation'), alertName: 'AgentSliceCheck', illustrative: true }, blockDuplicates: true });
    expect(await starter.start({ service: 'recommendation' })).toEqual({ incidentId: 'inc-002', label: 'INC-002' });
    await expect(starter.start({ service: 'recommendation' })).rejects.toBeInstanceOf(ConflictException);
    expect(invokeAgents).toHaveBeenCalledTimes(1);
  });

  it('rejects services that cannot be started', async () => {
    const starter = starterFor(freshWriter());
    await expect(starter.start({ service: 'payment' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(starter.start({})).rejects.toBeInstanceOf(BadRequestException);
  });
});
