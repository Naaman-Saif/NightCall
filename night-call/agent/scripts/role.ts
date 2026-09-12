import {
  CreateRoleCommand,
  GetRoleCommand,
  NoSuchEntityException,
  PutRolePolicyCommand,
  UpdateAssumeRolePolicyCommand,
} from '@aws-sdk/client-iam';

import { iam, ROLE_NAME } from './aws.js';
import { permissionsPolicy, trustPolicy } from './role-policies.js';

async function existingRoleArn(): Promise<string> {
  try {
    const { Role } = await iam.send(new GetRoleCommand({ RoleName: ROLE_NAME }));
    return Role?.Arn ?? '';
  } catch (error) {
    if (error instanceof NoSuchEntityException) return '';
    throw error;
  }
}

async function createOrRefreshRole(accountId: string): Promise<string> {
  const trust = trustPolicy(accountId);
  const found = await existingRoleArn();
  if (found !== '') {
    await iam.send(new UpdateAssumeRolePolicyCommand({ RoleName: ROLE_NAME, PolicyDocument: trust }));
    return found;
  }
  const created = await iam.send(new CreateRoleCommand({ RoleName: ROLE_NAME, AssumeRolePolicyDocument: trust }));
  return created.Role?.Arn ?? '';
}

export async function ensureRole(accountId: string): Promise<string> {
  const roleArn = await createOrRefreshRole(accountId);
  const policy = { RoleName: ROLE_NAME, PolicyName: 'NightCallAgentRuntimeAccess', PolicyDocument: permissionsPolicy(accountId) };
  await iam.send(new PutRolePolicyCommand(policy));
  return roleArn;
}
