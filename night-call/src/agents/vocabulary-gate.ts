import { BeforeToolCallEvent, type Agent } from '@strands-agents/sdk';

import { actionIsKnown } from '../config/vocabulary';

export const proposeToolName = 'propose_candidate';
const structuredOutputToolName = 'strands_structured_output';

function proposalIsInVocabulary(input: unknown): boolean {
  const action = (input as { action?: unknown } | undefined)?.action;
  return typeof action === 'string' && actionIsKnown(action);
}

export function installVocabularyGate(agent: Agent, allowedTools: string[]): void {
  const allowed = new Set([...allowedTools, structuredOutputToolName]);
  agent.addHook(BeforeToolCallEvent, (event) => {
    if (!allowed.has(event.toolUse.name)) {
      event.cancel = `tool ${event.toolUse.name} is outside this agent's allowed set`;
      return;
    }
    if (event.toolUse.name === proposeToolName && !proposalIsInVocabulary(event.toolUse.input)) {
      event.cancel = 'action is outside the vocabulary: use revert_flag, restart_service or set_flag';
    }
  });
}
