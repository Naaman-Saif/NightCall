import { ForbiddenException } from '@nestjs/common';

import { startInvestigation } from '../runtime/background-invoke';
import { invokeAgents } from '../runtime/runtime-invoker';
import { recoverAndInterrupt } from './boot-interruption';
import type { EventWriter } from './event-writer';
import { readSnapshot } from './incident-catalog';
import { appendAsRole } from './role-append';
import { appendAsService } from './service-append';
import { freshWriter, openIncident, toolBody } from './writer.fixture';

jest.mock('../runtime/runtime-invoker', () => ({ invokeAgents: jest.fn() }));

function invoked(statusCode: number) {
  return { runtimeSessionId: 's', statusCode, reply: '', elapsedMs: 1 };
}

function stateOf(writer: EventWriter, incidentId: string) {
  return readSnapshot(writer.stateDir, incidentId)?.investigation;
}

const completed = { actor: 'system' as const, type: 'investigation_finished' as const, summary: 'done', refs: [], payload: { reason: 'completed' } };

describe('investigation state', () => {
  beforeEach(() => jest.mocked(invokeAgents).mockReset());

  it('stays not started for an alert incident whose agents were never invoked, even after a restart', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    expect(stateOf(writer, incidentId)).toBe('not_started');
    await recoverAndInterrupt(writer);
    expect(stateOf(writer, incidentId)).toBe('not_started');
  });

  it('runs once the agents accepted the invoke and is interrupted by a restart', async () => {
    jest.mocked(invokeAgents).mockResolvedValue(invoked(200));
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const started = await startInvestigation({ writer, incidentId, trigger: 'manual' });
    expect(started).toMatchObject({ type: 'investigation_started', actor: 'system', payload: { trigger: 'manual' } });
    expect(stateOf(writer, incidentId)).toBe('running');
    await recoverAndInterrupt(writer);
    expect(stateOf(writer, incidentId)).toBe('interrupted');
  });

  it('is finished when a running investigation completes', async () => {
    jest.mocked(invokeAgents).mockResolvedValue(invoked(200));
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    await startInvestigation({ writer, incidentId, trigger: 'alert' });
    await appendAsService(writer, { incidentId, draft: completed });
    expect(stateOf(writer, incidentId)).toBe('finished');
  });

  it('records the reason when the invoke fails or is refused and stays not started', async () => {
    jest.mocked(invokeAgents).mockRejectedValueOnce(new Error('connection refused')).mockResolvedValueOnce(invoked(503));
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const thrown = await startInvestigation({ writer, incidentId, trigger: 'alert' });
    expect(thrown).toMatchObject({ type: 'investigation_invoke_failed', payload: { reason: 'Error: connection refused' } });
    const refused = await startInvestigation({ writer, incidentId, trigger: 'alert' });
    expect(refused.payload).toEqual({ reason: 'agents answered 503' });
    expect(stateOf(writer, incidentId)).toBe('not_started');
  });

  it('never lets a role write the investigation state', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const body = toolBody('investigation_started', { trigger: 'alert' });
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
