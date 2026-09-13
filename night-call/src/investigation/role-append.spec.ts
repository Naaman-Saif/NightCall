import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { roleForAuthorization } from '../tool-api/role-token';
import { roleMayWrite } from './allow-list';
import { ROLES, type EventType } from './event-types';
import { appendAsRole } from './role-append';
import { freshWriter, impactQuestion, openIncident, toolBody } from './writer.fixture';

const tokens = { lead: 'lead-value', investigator: 'investigator-value', verifier: 'verifier-value' };
const review = { verificationRunId: 'vr-1', mitigationId: 'm-1', contractId: 'c-1', approved: true, reasons: [] };
const serviceOnly: EventType[] = ['alert_received', 'evidence_recorded', 'cycle_finished', 'publication_changed', 'investigation_finished'];

describe('role appends', () => {
  it('refuses a lead token posting verification_reviewed even when the body claims verifier', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const role = roleForAuthorization('Bearer lead-value', tokens);
    expect(role).toBe('lead');
    const body = { actor: 'verifier', ...toolBody('verification_reviewed', review) };
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stores the role from the token as the actor', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const body = { actor: 'verifier', ...toolBody('question_asked', impactQuestion) };
    expect((await appendAsRole(writer, { role: 'lead', incidentId, body })).actor).toBe('lead');
  });

  it('follows the allow list for each role', () => {
    expect(roleMayWrite('lead', 'question_asked')).toBe(true);
    expect(roleMayWrite('lead', 'mitigation_proposed')).toBe(false);
    expect(roleMayWrite('investigator', 'mitigation_proposed')).toBe(true);
    expect(roleMayWrite('investigator', 'brief_updated')).toBe(false);
    expect(roleMayWrite('verifier', 'verification_reviewed')).toBe(true);
    expect(roleMayWrite('verifier', 'hypothesis_status_changed')).toBe(false);
  });

  it('refuses service-only and operator types for every role', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    for (const type of [...serviceOnly, 'context_supplied' as const]) {
      for (const role of ROLES) {
        const attempt = appendAsRole(writer, { role, incidentId, body: toolBody(type, {}) });
        await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
      }
    }
  });

  it('refuses a finished or unknown incident with a conflict', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const finished = { actor: 'system' as const, type: 'investigation_finished' as const, summary: 'done', refs: [] };
    await writer.update(incidentId, () => ({ ...finished, payload: { reason: 'completed' } }));
    const body = toolBody('question_asked', impactQuestion);
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body })).rejects.toBeInstanceOf(ConflictException);
    const unknown = appendAsRole(writer, { role: 'lead', incidentId: 'nothing-here', body });
    await expect(unknown).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects unknown payload fields', async () => {
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const body = toolBody('question_asked', { ...impactQuestion, shell: 'rm' });
    await expect(appendAsRole(writer, { role: 'lead', incidentId, body })).rejects.toBeInstanceOf(BadRequestException);
  });
});
