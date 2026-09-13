import { CreateRepositoryCommand, DescribeRepositoriesCommand, RepositoryNotFoundException } from '@aws-sdk/client-ecr';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AWS_PROFILE, AWS_REGION, ecr, REPOSITORY_NAME } from './aws.js';

const packageFolder = join(dirname(fileURLToPath(import.meta.url)), '..');

async function repositoryUri(): Promise<string> {
  try {
    const found = await ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [REPOSITORY_NAME] }));
    return found.repositories?.[0]?.repositoryUri ?? '';
  } catch (error) {
    if (!(error instanceof RepositoryNotFoundException)) throw error;
    const created = await ecr.send(new CreateRepositoryCommand({ repositoryName: REPOSITORY_NAME }));
    return created.repository?.repositoryUri ?? '';
  }
}

function logInToRegistry(uri: string): void {
  const registry = uri.split('/')[0];
  const password = `aws ecr get-login-password --profile ${AWS_PROFILE} --region ${AWS_REGION}`;
  execSync(`${password} | docker login --username AWS --password-stdin ${registry}`, { stdio: 'inherit' });
}

export async function pushImage(): Promise<string> {
  const commit = execSync('git rev-parse --short HEAD', { cwd: packageFolder }).toString().trim();
  const imageUri = `${await repositoryUri()}:arm64-${commit}`;
  logInToRegistry(imageUri);
  const build = `docker buildx build --platform linux/arm64 --provenance=false -t ${imageUri} --push .`;
  execSync(build, { cwd: packageFolder, stdio: 'inherit' });
  return imageUri;
}
