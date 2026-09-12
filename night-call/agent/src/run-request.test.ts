import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runRequestShape } from './run-request.js';

test('accepts a hello run for a plain incident id', () => {
  const parsed = runRequestShape.safeParse({ incidentId: 'hello-01', mode: 'hello' });
  assert.equal(parsed.success, true);
});

test('refuses an unknown mode and a path-like incident id', () => {
  assert.equal(runRequestShape.safeParse({ incidentId: 'a', mode: 'shell' }).success, false);
  assert.equal(runRequestShape.safeParse({ incidentId: '../x', mode: 'long' }).success, false);
});
