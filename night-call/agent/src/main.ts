import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime';

import { runHello } from './hello-run.js';
import { runLong } from './long-run.js';
import { logProgress } from './progress.js';
import { type RunRequest, runRequestShape } from './run-request.js';

const runs = { hello: runHello, long: runLong };

const app = new BedrockAgentCoreApp({
  invocationHandler: { requestSchema: runRequestShape, process: (request) => startRun(request) },
});

function startRun(request: RunRequest) {
  const taskId = app.addAsyncTask(`${request.mode}-run`, { incidentId: request.incidentId });
  logProgress({ ...request, started: true });
  void runs[request.mode](request.incidentId)
    .catch((error: unknown) => logProgress({ ...request, error: String(error) }))
    .finally(() => app.completeAsyncTask(taskId));
  return { accepted: true, ...request };
}

app.run();
