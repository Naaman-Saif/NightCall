import { AWS_REGION, readAccountId } from './aws.js';
import { pushImage } from './image.js';
import { ensureRole } from './role.js';
import { maskedEnvironment, runtimeShape } from './runtime-settings.js';
import { createOrUpdateRuntime } from './runtime.js';

async function deploy(): Promise<void> {
  const accountId = await readAccountId();
  console.log(`region: ${AWS_REGION}`);
  const roleArn = await ensureRole(accountId);
  console.log(`role: ${roleArn}`);
  const shape = runtimeShape('', roleArn);
  console.log(`environment: ${JSON.stringify(maskedEnvironment(shape.environmentVariables))}`);
  const imageUri = await pushImage();
  shape.agentRuntimeArtifact.containerConfiguration.containerUri = imageUri;
  const runtime = await createOrUpdateRuntime(shape);
  console.log(`status: ${runtime.status}`);
  console.log(`requireMMDSV2: ${runtime.metadataConfiguration?.requireMMDSV2}`);
  console.log(`version: ${runtime.agentRuntimeVersion}`);
  console.log(`arn: ${runtime.agentRuntimeArn}`);
}

deploy().catch((error: unknown) => {
  console.error(`deploy failed: ${String(error)}`);
  process.exitCode = 1;
});
