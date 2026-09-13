import { NotFoundException } from '@nestjs/common';

import { operatorHeaderMatches } from '../operator-api/operator.guard';
import { readLog } from './event-lines';
import { incidentFolder } from './incident-paths';
import { supplyContext } from './operator-context';
import { freshWriter, openIncident } from './writer.fixture';

describe('operator context', () => {
  it('returns the same event for a repeated idempotency key and stores it once', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const body = { questionId: 'q-impact', text: 'Tolerable', idempotencyKey: 'key-1' };
    const first = await supplyContext(writer, { incidentId, body });
    const second = await supplyContext(writer, { incidentId, body });
    expect(second).toEqual(first);
    const stored = readLog(incidentFolder(writer.stateDir, incidentId)).events;
    expect(stored.filter((event) => event.type === 'context_supplied')).toHaveLength(1);
    expect(first.actor).toBe('operator');
  });

  it('serializes two identical answers sent at the same moment', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const body = { questionId: null, text: 'Same', idempotencyKey: 'key-2' };
    const [first, second] = await Promise.all([supplyContext(writer, { incidentId, body }), supplyContext(writer, { incidentId, body })]);
    expect(second.id).toBe(first.id);
  });

  it('refuses an answer for an incident that does not exist', async () => {
    const writer = freshWriter();
    const attempt = supplyContext(writer, { incidentId: 'missing', body: { text: 'x', idempotencyKey: 'k' } });
    await expect(attempt).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts the operator header only when it equals a configured secret', () => {
    expect(operatorHeaderMatches('operator-value', 'operator-value')).toBe(true);
    expect(operatorHeaderMatches('wrong', 'operator-value')).toBe(false);
    expect(operatorHeaderMatches(undefined, 'operator-value')).toBe(false);
    expect(operatorHeaderMatches('', '')).toBe(false);
  });
});
