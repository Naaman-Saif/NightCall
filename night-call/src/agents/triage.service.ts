import { Injectable } from '@nestjs/common';
import { Agent } from '@strands-agents/sdk';

import { settings } from '../config/settings';
import type { FlagChange } from '../evidence/config-diff';
import type { Incident } from '../incidents/incident';
import { evidenceToolNames, evidenceTools } from './evidence-tools';
import { hypothesisSchema, type Hypothesis } from './hypothesis';
import { bedrockModel } from './model';
import { installVocabularyGate } from './vocabulary-gate';

const systemPrompt = `You are the triage step of an on-call agent. An alert has fired on a containerised web shop.
Use the tools to read logs, error spans and the config diff. Form one hypothesis about the cause.
Prefer the config diff when it explains the failure: a flag that moved is the most common cause of a night incident here.
Be specific and short. Never propose fixes. Never guess at evidence you did not read.`;

@Injectable()
export class TriageService {
  async run(incident: Incident, diff: FlagChange[]): Promise<Hypothesis> {
    const agent = new Agent({
      model: bedrockModel(settings.triageModelId),
      systemPrompt,
      tools: evidenceTools(diff),
      structuredOutputSchema: hypothesisSchema,
      printer: false,
    });
    installVocabularyGate(agent, evidenceToolNames);
    const prompt = `Alert ${incident.alert.name} fired at ${incident.alert.firedAt} for service ${incident.alert.service}. Summary: ${incident.alert.summary}. Investigate and return your hypothesis.`;
    const result = await agent.invoke(prompt, { limits: { turns: 8 } });
    return hypothesisSchema.parse(result.structuredOutput);
  }
}
