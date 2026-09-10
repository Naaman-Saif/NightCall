import { Injectable } from '@nestjs/common';
import { Agent } from '@strands-agents/sdk';
import { z } from 'zod';

import { bedrockModel } from '../agents/model';
import { settings } from '../config/settings';
import type { EvidenceBundle } from '../pipeline/evidence-bundle';
import { renderIssueBody, type IssueProse } from './issue-template';

const proseSchema = z.object({
  title: z.string().describe('under 90 characters: service, then the cause, no prefix'),
  hypothesisSection: z.string().describe('two to four plain sentences a sleepy engineer can read on a phone'),
  nextStep: z.string().describe('one sentence: what the human should do first when they wake up'),
});

const systemPrompt = `You write the prose parts of an incident issue for an on-call engineer who has not seen any of this yet.
You are given the full evidence bundle as JSON. Do not invent evidence. Do not restate numbers that are already in the bundle tables.
If the failure was not reproduced, say so plainly in the hypothesis section and keep the next step cautious.`;

@Injectable()
export class ReporterService {
  async write(bundle: EvidenceBundle): Promise<{ title: string; body: string }> {
    const agent = new Agent({ model: bedrockModel(settings.reporterModelId), systemPrompt, structuredOutputSchema: proseSchema, printer: false });
    const result = await agent.invoke(`Evidence bundle:\n${JSON.stringify(bundle, null, 2)}`, { limits: { turns: 2 } });
    const prose = proseSchema.parse(result.structuredOutput) as IssueProse;
    return { title: `${bundle.incident.alert.service}: ${prose.title}`, body: renderIssueBody(bundle, prose) };
  }
}
