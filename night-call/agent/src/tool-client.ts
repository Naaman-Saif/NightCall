const TOOL_TIMEOUT_MS = 60_000;

function toolAddress(path: string): string {
  return `${process.env.TOOL_API_URL ?? ''}${path}`;
}

function authorizedRequest(init: RequestInit): RequestInit {
  const headers = {
    authorization: `Bearer ${process.env.NIGHT_CALL_TOOL_TOKEN ?? ''}`,
    'content-type': 'application/json',
  };
  return { ...init, headers, signal: AbortSignal.timeout(TOOL_TIMEOUT_MS) };
}

async function readReply(path: string, response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`tool ${path} answered ${response.status}`);
  return response.json();
}

export async function getTool(path: string): Promise<unknown> {
  const response = await fetch(toolAddress(path), authorizedRequest({ method: 'GET' }));
  return readReply(path, response);
}

export async function postTool(path: string, body: unknown): Promise<unknown> {
  const init = authorizedRequest({ method: 'POST', body: JSON.stringify(body) });
  return readReply(path, await fetch(toolAddress(path), init));
}
