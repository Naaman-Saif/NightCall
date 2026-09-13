const TOOL_TIMEOUT_MS = 90_000;

export type ToolRole = 'lead' | 'investigator' | 'verifier';

export type ToolClient = {
  get(path: string): Promise<unknown>;
  post(path: string, body: unknown): Promise<unknown>;
};

export class ToolAnswerError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string = '',
  ) {
    super(`tool answered ${status}`);
  }
}

function requestInit(token: string, init: RequestInit): RequestInit {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  return { ...init, headers, signal: AbortSignal.timeout(TOOL_TIMEOUT_MS) };
}

async function readReply(response: Response): Promise<unknown> {
  if (response.ok) return response.json();
  const detail = await response.text().catch(() => '');
  throw new ToolAnswerError(response.status, detail.slice(0, 500));
}

export function toolClientFor(role: ToolRole): ToolClient {
  const token = process.env[`NIGHT_CALL_TOOL_TOKEN_${role.toUpperCase()}`] ?? '';
  const base = process.env.TOOL_API_URL ?? '';
  return {
    get: async (path) => readReply(await fetch(`${base}${path}`, requestInit(token, { method: 'GET' }))),
    post: async (path, body) => {
      const init = requestInit(token, { method: 'POST', body: JSON.stringify(body) });
      return readReply(await fetch(`${base}${path}`, init));
    },
  };
}
