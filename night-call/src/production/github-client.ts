import { settings } from '../config/settings';

const GITHUB_API = 'https://api.github.com';
const GITHUB_TIMEOUT_MS = 15_000;

export type GithubCall = { path: string; method?: string; body?: unknown };

function githubHeaders(): Record<string, string> {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${settings.githubToken}`,
    'content-type': 'application/json',
    'user-agent': 'night-call',
    'x-github-api-version': '2022-11-28',
  };
}

export async function githubJson<Result>(call: GithubCall): Promise<Result> {
  const method = call.method ?? 'GET';
  const body = call.body === undefined ? undefined : JSON.stringify(call.body);
  const init = { method, headers: githubHeaders(), body, signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS) };
  const response = await fetch(`${GITHUB_API}${call.path}`, init);
  if (!response.ok) throw new Error(`github ${method} ${call.path.split('?')[0]} answered ${response.status}`);
  return (await response.json()) as Result;
}

export function repositoryPath(suffix: string): string {
  return `/repos/${settings.githubRepository}${suffix}`;
}
