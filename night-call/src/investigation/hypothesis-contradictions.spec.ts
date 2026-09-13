import { BadRequestException } from '@nestjs/common';

import { readSnapshot } from './incident-catalog';
import { appendAsRole } from './role-append';
import { freshWriter, openIncident, toolBody } from './writer.fixture';

const proposal = {
  hypothesisId: 'h-traffic',
  claim: 'A traffic spike exhausted memory',
  supportingEvidenceIds: ['ev-memory'],
  contradictingEvidenceIds: ['ev-cpu'],
  predicted: 'Request rate rises before each crash',
};

describe('hypothesis contradictions', () => {
  it('copies each contradiction onto the hypothesis', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const contradictions = [{ evidenceId: 'ev-cpu', contradicts: 'CPU stayed flat before the crash' }];
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('hypothesis_proposed', { ...proposal, contradictions }) });
    await appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('hypothesis_proposed', { ...proposal, hypothesisId: 'h-cache' }) });
    const hypotheses = readSnapshot(writer.stateDir, incidentId)?.hypotheses ?? [];
    expect(hypotheses.map((hypothesis) => [hypothesis.id, hypothesis.contradictions])).toEqual([['h-traffic', contradictions], ['h-cache', []]]);
  });

  it('refuses a contradiction naming evidence that is not cited against the cause', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const contradictions = [{ evidenceId: 'ev-memory', contradicts: 'Memory grew without a traffic change' }];
    const attempt = appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('hypothesis_proposed', { ...proposal, contradictions }) });
    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    const tooLong = [{ evidenceId: 'ev-cpu', contradicts: 'x'.repeat(161) }];
    const long = appendAsRole(writer, { role: 'lead', incidentId, body: toolBody('hypothesis_proposed', { ...proposal, contradictions: tooLong }) });
    await expect(long).rejects.toBeInstanceOf(BadRequestException);
    expect(readSnapshot(writer.stateDir, incidentId)?.hypotheses).toEqual([]);
  });
});
