import { chunkOf } from './message-role-stream.js';

type EndState = { started: boolean; finished: boolean; toolCalls: boolean };

const DONE = '[DONE]';

function finishLine(state: EndState): string {
  const finishReason = state.toolCalls ? 'tool_calls' : 'stop';
  return `data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: finishReason }] })}\n\n`;
}

function noteChoice(line: string, state: EndState): boolean {
  const choice = chunkOf(line)?.choices?.[0];
  if (!choice) return false;
  state.started = true;
  state.toolCalls = state.toolCalls || Boolean(choice.delta?.tool_calls);
  state.finished = Boolean(choice.finish_reason);
  return true;
}

export function lineWithEnd(line: string, state: EndState): string {
  if (state.finished || !line.startsWith('data:')) return line;
  const isDone = line.slice('data:'.length).trim() === DONE;
  if (!isDone && noteChoice(line, state)) return line;
  if (!state.started || (!isDone && chunkOf(line) === null)) return line;
  state.finished = true;
  return `${finishLine(state)}${line}`;
}

export function endAdder(): TransformStream<string, string> {
  const state: EndState = { started: false, finished: false, toolCalls: false };
  return new TransformStream({
    transform(line, controller) {
      controller.enqueue(lineWithEnd(line, state));
    },
  });
}
