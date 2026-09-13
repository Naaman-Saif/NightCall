type StreamChunk = { choices?: Array<{ delta?: Record<string, unknown> }> };
type RoleState = { settled: boolean };

const DROPPED_HEADERS = ['content-length', 'content-encoding'];

function chunkOf(line: string): StreamChunk | null {
  try {
    return JSON.parse(line.slice('data:'.length).trim()) as StreamChunk;
  } catch {
    return null;
  }
}

export function lineWithRole(line: string, state: RoleState): string {
  const choice = line.startsWith('data:') ? chunkOf(line)?.choices?.[0] : undefined;
  if (!choice) return line;
  state.settled = true;
  if (choice.delta?.role) return line;
  const chunk = chunkOf(line) as StreamChunk & { choices: Array<{ delta?: Record<string, unknown> }> };
  chunk.choices[0] = { ...chunk.choices[0], delta: { ...chunk.choices[0].delta, role: 'assistant' } };
  return `data: ${JSON.stringify(chunk)}\n`;
}

function lineSplitter(): TransformStream<string, string> {
  const pending = { text: '' };
  return new TransformStream({
    transform(text, controller) {
      const lines = (pending.text + text).split('\n');
      pending.text = lines.pop() ?? '';
      lines.forEach((line) => controller.enqueue(`${line}\n`));
    },
    flush(controller) {
      if (pending.text) controller.enqueue(pending.text);
    },
  });
}

function roleAdder(): TransformStream<string, string> {
  const state: RoleState = { settled: false };
  return new TransformStream({
    transform(line, controller) {
      controller.enqueue(state.settled ? line : lineWithRole(line, state));
    },
  });
}

export function streamWithMessageRole(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return body
    .pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>)
    .pipeThrough(lineSplitter())
    .pipeThrough(roleAdder())
    .pipeThrough(new TextEncoderStream() as unknown as TransformStream<string, Uint8Array>);
}

export function fetchWithMessageRole(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const response = await baseFetch(input, init);
    const isEventStream = response.headers.get('content-type')?.includes('text/event-stream');
    if (!isEventStream || !response.body) return response;
    const headers = new Headers(response.headers);
    DROPPED_HEADERS.forEach((name) => headers.delete(name));
    return new Response(streamWithMessageRole(response.body), { status: response.status, statusText: response.statusText, headers });
  };
}
