import { Injectable } from '@nestjs/common';
import { Agent, tool } from '@strands-agents/sdk';
import { z } from 'zod';

import { settings } from '../config/settings';
import { actionVocabulary } from '../config/vocabulary';
import type { FlagChange } from '../evidence/config-diff';
import type { Candidate } from '../sandbox/actions';
import type { Hypothesis } from './hypothesis';
import { bedrockModel } from './model';
import { installVocabularyGate, proposeToolName } from './vocabulary-gate';

const systemPrompt = `You are the remediation step of an on-call agent. You will be given a hypothesis and the config diff.
Propose fix candidates by calling propose_candidate, best first, at most three. Each candidate is exactly one action:
revert_flag(target=flag name) puts a flag back to its last healthy value and is tried automatically.
restart_service(target=service name) restarts one container and is tried automatically.
set_flag(target=flag name, value=any other variant) is written down for a human and never run.
Prefer revert_flag when the diff shows a flag moved. Do not propose anything outside these three actions.`;

const proposalSchema = z.object({
  action: z.enum(actionVocabulary),
  target: z.string(),
  value: z.string().optional(),
  rationale: z.string(),
});

@Injectable()
export class RemediatorService {
  async run(hypothesis: Hypothesis, diff: FlagChange[]): Promise<Candidate[]> {
    const proposals: Candidate[] = [];
    const propose = tool({
      name: proposeToolName,
      description: 'Record one fix candidate. Call once per candidate, best first.',
      inputSchema: proposalSchema,
      callback: (input) => {
        proposals.push(input);
        return `recorded candidate ${proposals.length}`;
      },
    });
    const agent = new Agent({ model: bedrockModel(settings.remediatorModelId), systemPrompt, tools: [propose], printer: false });
    installVocabularyGate(agent, [proposeToolName]);
    const prompt = `Hypothesis: ${JSON.stringify(hypothesis)}\nConfig diff: ${JSON.stringify(diff)}\nPropose candidates now.`;
    await agent.invoke(prompt, { limits: { turns: 6 } });
    return proposals.slice(0, 3);
  }
}
