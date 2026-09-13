import { parseRoleSetting, readRoleSetting, reasoningFor, type RoleSetting } from './model.js';

export const SHORT_TURN_HINT = 'Keep reasoning short. Call at most one tool per turn. Final answer under 250 words.';
export const DEFAULT_LEAD_FALLBACK_MODEL = 'featherless:moonshotai/Kimi-K3';
export const FALLBACK_ATTEMPT = 3;

export function promptForAttempt(request: { prompt: string; attempt: number }): string {
  return request.attempt > 1 ? `${request.prompt}\n${SHORT_TURN_HINT}` : request.prompt;
}

export function causeSettingForAttempt(attempt: number, env: NodeJS.ProcessEnv = process.env): RoleSetting {
  return { ...readRoleSetting('LEAD', env), role: attempt > 1 ? 'LEAD_RETRY' : 'LEAD' };
}

export function settingForAttempt(attempt: number, env: NodeJS.ProcessEnv = process.env): RoleSetting {
  if (attempt < FALLBACK_ATTEMPT) return readRoleSetting('LEAD', env);
  const fallback = parseRoleSetting('LEAD_FALLBACK', env.NIGHT_CALL_LEAD_FALLBACK_MODEL || DEFAULT_LEAD_FALLBACK_MODEL);
  return { ...fallback, reasoning: reasoningFor('LEAD_FALLBACK', env) };
}
