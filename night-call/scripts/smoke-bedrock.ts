import { Agent } from '@strands-agents/sdk';

import { settings } from '../src/config/settings';

async function askOneQuestion(): Promise<string> {
  process.env.AWS_REGION = settings.bedrockRegion;
  const agent = new Agent({
    systemPrompt: 'Answer in one short sentence.',
    model: settings.defaultModelId || undefined,
  });
  const result = await agent.invoke('Name one reason a config change breaks production.');
  return String(result);
}

askOneQuestion()
  .then((answer) => {
    console.log(`region=${settings.bedrockRegion} model=${settings.defaultModelId || 'default'}`);
    console.log(answer);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
