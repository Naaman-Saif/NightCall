# Connect the agents to AWS, and build the sandbox copy of the shop

Status: built and merged to main 2026-09-13 about 03:20 PKT.
- Part B done: one real round passed on the box (details in NOTES).
- Part A done except AgentCore hosting, which the account blocks (agent quota 0, increase request pending). Approved fallback live: agent container on the box reaching the tool API through a quick tunnel. All other Part A checks passed.

Part A proves the riskiest link: AWS hosting the agents and calling back to the box. Part B ports the proven Python cache runner to TypeScript so experiments run from the NightCall image. They share one plan, review and walkthrough. Part A owns every restart of the `night-call` container; Part B never runs inside that container, it runs in its own one-off container from the same image, so a Part A restart cannot kill a round mid-way.

## Decided (Saif)

- Secrets (Featherless key, box tool token) are environment variables on the AgentCore runtime. Risk accepted: visible to anyone with admin access to the AWS account.
- Tool API address: temporary Cloudflare quick tunnel for this step unless Saif answers otherwise below.
- Agents ship as a Docker image built on Saif's Mac. Mac AWS profile `night-call` works; Docker Desktop 29.1.3 on linux/arm64 is running.

- Cloudflare named-tunnel token that appeared in the reviewer's local session log: risk accepted, not rotated.
- Quick tunnel kept for the tools address in this step.
- Reading a checksum inside the live recommendation container is fine (read-only).
- Docker Sandboxes checked and ruled out for now: the Desktop plugin only runs claude or gemini agents on the Mac, and the standalone `sbx` needs KVM, which the box (Hetzner cloud VM, no `/dev/kvm`) does not have. Sandbox stays a sealed Docker Compose copy on the box. Roadmap idea: one `sbx` shell sandbox per shop copy on a KVM host.

Approved by Saif 2026-09-13 about 03:45 PKT.

## Decided (technical, from the review)

- **Deploy script in TypeScript, not the AWS CLI.** The Mac's aws-cli 2.12.2 (installer package) has no AgentCore commands, and neither CLI exposes the mandatory MMDSv2 setting. `agent/scripts/deploy.ts` uses `@aws-sdk/client-bedrock-agentcore-control` 3.1131.0, ECR and IAM clients with profile `night-call`. The old CLI is used only for `aws ecr get-login-password`.
- **Two image tags, not one multi-arch image.** `:arm64` built on the Mac for AgentCore. The x86 fallback is built on the box from the repo when needed.
- **Required settings trimmed.** `main.ts` refuses to start while `NIGHT_CALL_MODEL_ID` is blank; that is why the container has been down for 43 hours. `NIGHT_CALL_MODEL_ID`, `GITHUB_TOKEN` and `NIGHT_CALL_GITHUB_REPOSITORY` leave the required list (the old pipeline that needed them is unregistered here).
- **Sandbox project name `nc-sandbox`** replaces `clone` in settings and in the write guard.
- **CPU from the difference between consecutive one-shot samples.** One-shot stats return no previous CPU reading, and full stats take about 1 s per call. CPU percent = container CPU change / system CPU change × online CPUs × 100; first sample empty.
- **Public state route removed.** The status Caddy site serves the whole state folder at `/state/*`; that would publish event logs and later operator answers once port 8001 is exposed. The route goes.
- **Production-safe rebuild.** `docker compose -p prod ... up -d --build --no-deps night-call night-call-status` so no production service is recreated.

## Part A: agents hosted on AgentCore, talking to the box

### Facts

- Contract: `0.0.0.0:8080`, linux/arm64, `POST /invocations`, `GET /ping` `Healthy` or `HealthyBusy`, session id header `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` (the SDK returns 400 without it), image up to 2 GB, request timeout 15 min, background work up to 8 h.
- `bedrock-agentcore` 0.4.4 (ESM): `BedrockAgentCoreApp` from `bedrock-agentcore/runtime`, `addAsyncTask`, `completeAsyncTask`. Names confirmed by the review.
- MMDSv2 mandatory since 2026-06-30, set through `UpdateAgentRuntime` right after create.
- `@aws-sdk/client-bedrock-agentcore` ships a CommonJS build, so the Nest service can use it (new dependency). Box keys can invoke.
- Quick tunnel: about 200 in-flight requests, no uptime guarantee, new URL on every restart (needs a runtime environment update and new sessions).

### Tasks

1. **Agent package** `agent/` (ESM, Node 22, target ES2022, own lock file committed): `src/main.ts`, `src/hello-run.ts`, `src/model.ts` (from `scripts/smoke-models.ts`), `src/tool-client.ts`, `src/progress.ts`. Handler: register the async task, start the work with its own catch and a `finally` that completes the task, return `{ accepted: true }`. Payload `{ incidentId, mode: 'hello' | 'long' }`; `long` waits 16 minutes in steps, then posts a final event.
2. **Dockerfile** `agent/Dockerfile`: build stage (`npm ci`, `tsc`), runtime stage `node:22-slim`, pruned dependencies, numeric `USER 1000`, port 8080.
3. **Deploy** `agent/scripts/deploy.ts` plus `npm run deploy`: ECR repo `nightcall-agents`; `docker buildx build --platform linux/arm64 -t ...:arm64 --push`; execution role `NightCallAgentRuntime` from the AWS template minus the Bedrock statement (ECR pull, `ecr:GetAuthorizationToken`, CloudWatch logs, X-Ray, `cloudwatch:PutMetricData` in the bedrock-agentcore namespace, `bedrock-agentcore:GetWorkloadAccessToken*`); create or update runtime `nightcall_agents` (PUBLIC, HTTP, environment variables, idle timeout 1200 s, max lifetime 3600 s); update with MMDSv2; poll to `READY`; print the ARN.
4. **Nest tool API**: `tool-api/bearer.guard.ts` (constant-time compare with `NIGHT_CALL_TOOL_TOKEN`), `GET /tool/ping`, `POST /tool/incidents/:id/events` appending the plan's event shape `{id, incidentId, sequence, occurredAt, actor, type, summary, refs, payload}` with the server assigning `sequence`.
5. **Runtime invoker** `runtime/runtime-invoker.ts` (ARN from `NIGHT_CALL_AGENT_RUNTIME_ARN`, new session id of 36+ characters per run, stream consumed) and `scripts/invoke-hello.ts`.
6. **Settings**: trim required list; `NIGHT_CALL_SANDBOX_PROJECT=nc-sandbox`; add `NIGHT_CALL_TOOL_TOKEN`, `NIGHT_CALL_AGENT_RUNTIME_ARN`, `NIGHT_CALL_RUNS_PATH`. Unregister `PipelineModule` from `AppModule`.
7. **Caddy**: new `:8002` site serving only `/tool/*`; remove `/state/*` from the `:8001` site.
8. **Tunnel**: start the tunnel on the box to `127.0.0.1:8002`, put its URL in the runtime environment.
9. **Rebuild and start** `night-call` and `night-call-status` with `--no-deps`.
10. **Clean up at the end of the step**: stop the long session or let it expire, stop the tunnel, keep the tool token only in the gitignored `.env`.

### Done when

| Check | Expected |
|---|---|
| Runtime | deploy script reports `READY`, and `GetAgentRuntime` through the SDK shows MMDSv2 required |
| Container healthy | `night-call` Up for at least 5 minutes; no `PipelineService` or snapshot watcher log lines |
| Hello run | invoke returns `accepted` in under 5 s; within 60 s: `GET /tool/ping` with a valid token in the box log, a Featherless reply, an event with server-assigned sequence in `events.jsonl` |
| Token and surface | through the tunnel URL: `/tool/ping` without or with a wrong token gets 401; `/alerts` gets 404 |
| Long run | final event arrives after 16 minutes; no session termination in runtime logs |
| Fallback | x86 image built on the box answers `POST /invocations` with a session header |
| No public state | `curl 127.0.0.1:8001/state/incidents.json` gets 404 |
| Quality | lint, tests and build pass in the service and agent packages |

## Part B: sandbox copy of the shop in TypeScript

### Tasks

1. `src/sandbox-copy/` one thing per file, each under 100 lines (constants, time budget, docker CLI with budget-capped timeouts, production compose render with a clean environment, sandbox compose, preflight refusing an existing run folder, project or network, copy mount only from under the shop path, isolate service, collector config, isolation rules that throw, build sandbox compose, run files with umask 077 and `collector.yml` at 644, production identity, container address on a named network, sandbox network join and leave, observation with memory, CPU and restarts, recommendations request, stack ready with 180 s frontend wait, restart recommendation waiting for the healthcheck, workload, stop rules including `OOMKilled`, workload summary including empty responses and restart count, docker events started before the stack and stopped in cleanup, stage evidence with logs since and traces from the sandbox Jaeger, container snapshot, stages, round, cleanup with signal handlers).
2. **Reusable API**: `startSandbox`, `runRound({ flagVariant, restart, count, pacingMs, stopOnFailure })`, `stopSandbox`. The later experiments step needs a warm stack and repeated rounds.
3. **Entry** `src/sandbox-copy/run-one-round.ts`, run in a one-off container: `docker compose -p prod ... run --rm --no-deps night-call node dist/sandbox-copy/run-one-round.js <run-id>` with the same socket, shop and runs mounts.
4. **Overlay**: same-path bind `/root/code/nightcall-runs` in `compose.nightcall.yaml`.
5. **Flag writes stay in place.** `flagd-file.ts` truncates and rewrites the same file; never switch to rename, or the single-file bind stops seeing changes.
6. **Unit tests**: isolation rules, stop rules, workload summary, CPU percent from two samples.

### Done when

| Check | Expected |
|---|---|
| One round | baseline 400 of 400 healthy with no empty responses; fault stage has an out-of-memory event for `nc-sandbox-recommendation` and at least one failed request; mitigated 400 of 400 healthy, peak under 80 percent of 500 MiB |
| CPU | a number on every sample after the first; above 0 during the fault stage |
| Isolation | `isolation.json` valid; sandbox containers have no ports, internal network only, read-only binds under the run folder |
| Production untouched | production identity before equals after |
| Cleanup | no `nc-sandbox` containers or networks; the one-off container has left the sandbox network and exited |
| Timing | round minutes in NOTES next to the Python numbers |
| Quality | lint, tests and build pass |

## Not in these steps

No investigation state model beyond event appends, no web page, no real agent roles, no symptom contract, no three-round verification, no PR, no deletion of old files, no production flag change.

## Risks

- AgentCore create or invoke fails: runtime logs, fix, retry; at 05:30 PKT switch to the box container fallback and continue.
- Featherless unreachable from AgentCore: the hello run proves it; fallback is the box container.
- Background task stuck busy or killed: own catch and finally; raise idle timeout before blaming the SDK.
- Sandbox containers can reach `night-call:8000/alerts` while the one-off runner is attached to their network; low risk, the one-off container does not serve that route.
- Time: Part A about 4 to 6 hours, Part B about 5 to 6 hours. Hard switch to the fallback at 05:30 PKT if AgentCore is not answering.
