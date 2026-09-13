import assert from 'node:assert/strict';
import { test } from 'node:test';

import { promptForAttempt, settingForAttempt, SHORT_TURN_HINT } from './attempt-plan.js';

const env = { NIGHT_CALL_LEAD_MODEL: 'featherless:zai-org/GLM-5.3' };

test('the first attempt keeps the prompt and every retry asks for short turns', () => {
  assert.equal(promptForAttempt({ prompt: 'Read the evidence.', attempt: 1 }), 'Read the evidence.');
  assert.equal(promptForAttempt({ prompt: 'Read the evidence.', attempt: 2 }), `Read the evidence.\n${SHORT_TURN_HINT}`);
  assert.ok(promptForAttempt({ prompt: 'Read the evidence.', attempt: 3 }).endsWith('Final answer under 250 words.'));
});

test('attempts one and two use the lead model and the third switches to the fallback', () => {
  assert.equal(settingForAttempt(1, env).modelId, 'zai-org/GLM-5.3');
  assert.equal(settingForAttempt(2, env).modelId, 'zai-org/GLM-5.3');
  assert.deepEqual([settingForAttempt(3, env).provider, settingForAttempt(3, env).modelId], ['featherless', 'moonshotai/Kimi-K3']);
});

test('a configured fallback model wins over the default', () => {
  const configured = { ...env, NIGHT_CALL_LEAD_FALLBACK_MODEL: 'featherless:other/Model-1' };
  assert.equal(settingForAttempt(3, configured).modelId, 'other/Model-1');
});
