import assert from 'node:assert/strict';
import { test } from 'node:test';

import { newLedger } from './evidence-ledger.js';
import { readAndNote, REPLY_BYTE_LIMIT, type LeadSession, trimmedView } from './evidence-view.js';
import type { IncidentApi } from './incident-api.js';
import type { ProgressEvent } from './progress.js';
import { briefProblem, postHypothesis } from './write-tools.js';

function recordingSession(): LeadSession & { posted: ProgressEvent[] } {
  const posted: ProgressEvent[] = [];
  const api: IncidentApi = {
    read: async () => ({ evidence: { evidenceId: 'ev-memory-1', kind: 'memory', summary: 'climbing', excerpt: 'x'.repeat(20_000) }, data: {} }),
    postEvent: async (event) => posted.push(event),
    waitForAnswers: async () => [],
    readCase: async () => ({}),
  };
  return { api, ledger: newLedger(), posted };
}

const hypothesis = (ids: string[]) => ({ claim: 'The cache grows until memory runs out', supportingEvidenceIds: ids, contradictingEvidenceIds: [], predicted: 'Memory climbs with the flag on' });

test('evidence replies are trimmed to 6 KB keeping the newest excerpt lines', () => {
  const view = trimmedView({ evidenceId: 'ev-logs-1', kind: 'logs', summary: 'lines', excerpt: `${'old\n'.repeat(4_000)}newest line` });
  assert.ok(Buffer.byteLength(view) <= REPLY_BYTE_LIMIT);
  assert.ok((JSON.parse(view) as { excerpt: string }).excerpt.endsWith('newest line'));
});

test('a reading records its evidence id and the model sees no raw data', async () => {
  const session = recordingSession();
  const reply = await readAndNote(session, { reader: 'memory', query: { service: 'recommendation', minutes: 10 } });
  assert.equal(session.ledger.ids.has('ev-memory-1'), true);
  assert.deepEqual(Object.keys(JSON.parse(reply) as object), ['evidenceId', 'kind', 'summary', 'excerpt']);
});

test('hypotheses must cite evidence that exists and stop at three', async () => {
  const session = recordingSession();
  assert.match(await postHypothesis(session, hypothesis(['ev-made-up'])), /unknown evidence ids ev-made-up/);
  session.ledger.ids.add('ev-memory-1');
  for (let count = 0; count < 3; count += 1) await postHypothesis(session, hypothesis(['ev-memory-1']));
  assert.match(await postHypothesis(session, hypothesis(['ev-memory-1'])), /already proposed/);
  assert.deepEqual(session.posted.map((event) => event.payload.hypothesisId), ['h-1', 'h-2', 'h-3']);
});

test('the brief never claims proof or names roles and models', () => {
  const ledger = newLedger();
  ledger.ids.add('ev-memory-1');
  const brief = { summary: 'Memory climbs.', knownFacts: [{ text: 'Memory hit the limit', evidenceIds: ['ev-memory-1'] }], unknowns: [], nextStep: 'Test the flag.' };
  assert.equal(briefProblem(ledger, brief), null);
  assert.match(briefProblem(ledger, { ...brief, summary: 'The cause is proven.' }) ?? '', /proven/);
  assert.match(briefProblem(ledger, { ...brief, nextStep: 'The verifier checks it.' }) ?? '', /verifier/);
});
