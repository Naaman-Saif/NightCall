import assert from 'node:assert/strict';
import { test } from 'node:test';

import { promptForAttempt, settingForAttempt, SHORT_TURN_HINT } from './attempt-plan.js';
import { featherlessParams, readRoleSetting } from './model.js';

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

test('reasoning is high by default, set per role, and the fallback has its own setting', () => {
  assert.equal(settingForAttempt(1, env).reasoning, 'high');
  assert.equal(settingForAttempt(3, env).reasoning, 'high');
  const configured = { ...env, NIGHT_CALL_LEAD_REASONING: 'medium', NIGHT_CALL_LEAD_FALLBACK_REASONING: 'low' };
  assert.deepEqual([settingForAttempt(2, configured).reasoning, settingForAttempt(3, configured).reasoning], ['medium', 'low']);
  assert.equal(readRoleSetting('VERIFIER', { NIGHT_CALL_VERIFIER_MODEL: 'featherless:moonshotai/Kimi-K3' }).reasoning, 'high');
});

test('every model gets its reasoning setting and room for 32768 completion tokens, and none leaves reasoning out', () => {
  const kimi = readRoleSetting('VERIFIER', { NIGHT_CALL_VERIFIER_MODEL: 'featherless:moonshotai/Kimi-K3' });
  assert.deepEqual(featherlessParams(kimi), { parallel_tool_calls: false, max_tokens: 32_768, reasoning_effort: 'high' });
  assert.deepEqual(featherlessParams({ ...kimi, reasoning: 'none' }), { parallel_tool_calls: false, max_tokens: 32_768 });
});

test('a configured fallback model wins over the default', () => {
  const configured = { ...env, NIGHT_CALL_LEAD_FALLBACK_MODEL: 'featherless:other/Model-1' };
  assert.equal(settingForAttempt(3, configured).modelId, 'other/Model-1');
});
