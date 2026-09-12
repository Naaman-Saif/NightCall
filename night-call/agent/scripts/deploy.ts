import { readAccountId } from './aws.js';
import { pushImage } from './image.js';
import { ensureRole } from './role.js';
import { maskedEnvironment, runtimeShape } from './runtime-settings.js';
import { createOrFindRuntime, updateWithMetadataV2 } from './runtime.js';

async function deploy(): Promise<void> {
  const accountId = await readAccountId();
  const roleArn = await ensureRole(accountId);
  console.log(`role: ${roleArn}`);
  const imageUri = await pushImage();
  const shape = runtimeShape(imageUri, roleArn);
  console.log(`environment: ${JSON.stringify(maskedEnvironment(shape.environmentVariables))}`);
  const agentRuntimeId = await createOrFindRuntime(shape);
  const runtime = await updateWithMetadataV2(agentRuntimeId, shape);
  console.log(`status: ${runtime.status}`);
  console.log(`requireMMDSV2: ${runtime.metadataConfiguration?.requireMMDSV2}`);
  console.log(`version: ${runtime.agentRuntimeVersion}`);
  console.log(`arn: ${runtime.agentRuntimeArn}`);
}

deploy().catch((error: unknown) => {
  console.error(`deploy failed: ${String(error)}`);
  process.exitCode = 1;
});
