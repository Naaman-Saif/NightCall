import { BedrockAgentCoreControlClient } from '@aws-sdk/client-bedrock-agentcore-control';
import { ECRClient } from '@aws-sdk/client-ecr';
import { GetUserCommand, IAMClient } from '@aws-sdk/client-iam';
import { fromIni } from '@aws-sdk/credential-providers';

export const AWS_PROFILE = process.env.NIGHT_CALL_AWS_PROFILE || 'night-call';
export const AWS_REGION = process.env.NIGHT_CALL_AGENTCORE_REGION || 'us-west-1';
export const REPOSITORY_NAME = 'nightcall-agents';
export const ROLE_NAME = 'NightCallAgentRuntime';
export const RUNTIME_NAME = 'nightcall_agents';

export const clientSettings = { region: AWS_REGION, credentials: fromIni({ profile: AWS_PROFILE }) };

export const ecr = new ECRClient(clientSettings);
export const iam = new IAMClient(clientSettings);
export const agentCore = new BedrockAgentCoreControlClient(clientSettings);

export async function readAccountId(): Promise<string> {
  const { User } = await iam.send(new GetUserCommand({}));
  const accountId = User?.Arn?.split(':')[4] ?? '';
  if (accountId === '') throw new Error('could not read the AWS account id');
  return accountId;
}
