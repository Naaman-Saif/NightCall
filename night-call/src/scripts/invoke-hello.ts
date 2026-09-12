import { invokeAgents } from '../runtime/runtime-invoker';

async function invokeFromCommandLine(): Promise<void> {
  const mode = process.argv[2] === 'long' ? 'long' : 'hello';
  const incidentId = process.argv[3] ?? `${mode}-${Date.now()}`;
  const outcome = await invokeAgents({ incidentId, mode });
  console.log(JSON.stringify({ incidentId, mode, ...outcome }));
}

invokeFromCommandLine().catch((error: unknown) => {
  console.error(`invoke failed: ${String(error)}`);
  process.exitCode = 1;
});
