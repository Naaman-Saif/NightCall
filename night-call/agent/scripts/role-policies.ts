import { AWS_REGION, REPOSITORY_NAME, RUNTIME_NAME } from './aws.js';

function statement(actions: string[], resources: string[]) {
  return { Effect: 'Allow', Action: actions, Resource: resources };
}

export function trustPolicy(accountId: string): string {
  const condition = {
    StringEquals: { 'aws:SourceAccount': accountId },
    ArnLike: { 'aws:SourceArn': `arn:aws:bedrock-agentcore:${AWS_REGION}:${accountId}:*` },
  };
  const principal = { Service: 'bedrock-agentcore.amazonaws.com' };
  const trust = { Effect: 'Allow', Principal: principal, Action: 'sts:AssumeRole', Condition: condition };
  return JSON.stringify({ Version: '2012-10-17', Statement: [trust] });
}

function logStatements(accountId: string) {
  const logGroups = `arn:aws:logs:${AWS_REGION}:${accountId}:log-group`;
  return [
    statement(['logs:DescribeLogStreams', 'logs:CreateLogGroup'], [`${logGroups}:/aws/bedrock-agentcore/runtimes/*`]),
    statement(['logs:DescribeLogGroups'], [`${logGroups}:*`]),
    statement(['logs:CreateLogStream', 'logs:PutLogEvents'], [`${logGroups}:/aws/bedrock-agentcore/runtimes/*:log-stream:*`]),
  ];
}

function workloadTokenStatement(accountId: string) {
  const directory = `arn:aws:bedrock-agentcore:${AWS_REGION}:${accountId}:workload-identity-directory/default`;
  const actions = ['GetWorkloadAccessToken', 'GetWorkloadAccessTokenForJWT', 'GetWorkloadAccessTokenForUserId'];
  const resources = [directory, `${directory}/workload-identity/${RUNTIME_NAME}-*`];
  return statement(actions.map((action) => `bedrock-agentcore:${action}`), resources);
}

export function permissionsPolicy(accountId: string): string {
  const repository = `arn:aws:ecr:${AWS_REGION}:${accountId}:repository/${REPOSITORY_NAME}`;
  const xrayActions = ['PutTraceSegments', 'PutTelemetryRecords', 'GetSamplingRules', 'GetSamplingTargets'];
  const metrics = statement(['cloudwatch:PutMetricData'], ['*']);
  const namespaceCondition = { StringEquals: { 'cloudwatch:namespace': 'bedrock-agentcore' } };
  const statements = [
    statement(['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer'], [repository]),
    statement(['ecr:GetAuthorizationToken'], ['*']),
    ...logStatements(accountId),
    statement(xrayActions.map((action) => `xray:${action}`), ['*']),
    { ...metrics, Condition: namespaceCondition },
    workloadTokenStatement(accountId),
  ];
  return JSON.stringify({ Version: '2012-10-17', Statement: statements });
}
