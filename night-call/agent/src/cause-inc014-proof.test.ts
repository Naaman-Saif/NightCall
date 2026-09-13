import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Cause } from './cause-rules.js';
import { findCauses } from './causes.js';
import { addFlagOffReading, FLAG_CAUSE, FLAG_OFF, FLAG_OFF_CAUSE, FLAG_OFF_SENTENCE, inc014Ledger, LEAK_CAUSE, RESTART_CAUSE } from './inc014-fixture.test.js';
import type { IncidentApi } from './incident-api.js';
import type { Lead } from './lead-steps.js';
import type { ProgressEvent } from './progress.js';
import { newProofRecord } from './proof-record.js';
import { proveAndDecide } from './proof-steps.js';
import { stubProof } from './proof-stub.test.js';
import { newRun, type RunContext } from './run-steps.js';
import { ToolAnswerError } from './tool-client.js';

type Posting = { events: ProgressEvent[]; refuseContradictions: boolean };

function apiFor(posting: Posting): IncidentApi {
  return {
    read: async () => {
      throw new Error('no readings are taken in this test');
    },
    postEvent: async (event) => {
      if (posting.refuseContradictions && 'contradictions' in event.payload) throw new ToolAnswerError(400, '{"message":"Unrecognized key: contradictions"}');
      posting.events.push(event);
    },
    waitForAnswers: async () => [],
    readCase: async () => ({}),
  };
}

function contextFor(causes: Cause[], posting: Posting): { context: RunContext; steps: string[] } {
  const recorded = { steps: [] as string[] };
  const lead: Lead = { proposeCauses: async () => causes, classify: async () => ({ urgency: 'rush', reason: 'Treated as urgent.' }) };
  const context: RunContext = { api: apiFor(posting), ledger: inc014Ledger(), lead, proof: stubProof(recorded, {}), record: newProofRecord(), run: newRun() };
  return { context, steps: recorded.steps };
}

test('INC-014: after the checks the reproduction tests the most likely cause, the flag, even when the leak is listed first', async () => {
  const { context, steps } = contextFor([LEAK_CAUSE, FLAG_CAUSE, RESTART_CAUSE], { events: [], refuseContradictions: false });
  const outcome = await findCauses(context);
  const flagId = outcome.mostLikely?.hypothesisId ?? '';
  assert.equal(outcome.mostLikely?.claim, FLAG_CAUSE.claim);
  assert.notEqual(flagId, outcome.causes[0].hypothesisId);
  await proveAndDecide(context, { causes: outcome, pending: null });
  assert.deepEqual(steps.filter((step) => step.startsWith('proof experiment')), [`proof experiment ${flagId} incident_traffic flag on speed 1`]);
});

test('the contradicts sentence is posted as contradictions, and left out when an older server refuses the field', async () => {
  for (const refuseContradictions of [false, true]) {
    const posting: Posting = { events: [], refuseContradictions };
    const { context } = contextFor([FLAG_OFF_CAUSE, RESTART_CAUSE], posting);
    addFlagOffReading(context.ledger);
    await findCauses(context);
    const proposed = posting.events.filter((event) => event.type === 'hypothesis_proposed');
    assert.equal(proposed.length, 2);
    assert.deepEqual(proposed[0].payload.contradictions, refuseContradictions ? undefined : [{ evidenceId: FLAG_OFF, contradicts: FLAG_OFF_SENTENCE }]);
    assert.deepEqual(proposed[0].payload.contradictingEvidenceIds, [FLAG_OFF]);
    assert.equal('contradictions' in proposed[1].payload, false);
  }
});
