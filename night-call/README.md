# NightCall

NightCall is an incident investigator for the developer who is on call for everything. When a service starts failing, it reads the real signals from production, asks you one question about customer impact, and writes a live incident report where every number links to the reading it came from. Then it rebuilds the failure in a sealed copy of the shop, replaying the real traffic it captured from traces, proves a fix works 3 times out of 3, and opens a one-line pull request for a human to review. It never changes production.

Built for the Devpost "Agents for Humans" hackathon on the Strands Agents SDK (TypeScript) and Amazon Bedrock AgentCore Runtime.

## What a run looks like

The incident is the Astronomy Shop (the OpenTelemetry Demo) recommendation service running out of memory after a release turned on the `recommendationCacheFailure` flag. This is the real run INC-015 from 2026-09-14, numbers as recorded:

| Time (UTC) | What happened |
|---|---|
| 05:22:00 | Investigation started by hand from the incident page, labelled "Manually triggered". |
| next few minutes | Read 9 signals: frontend failure rate 1.65 percent, backend span failures 0.00 percent, 4 out-of-memory restarts in 10 minutes, memory peak 355 MiB of a 500 MiB limit, CPU, logs, 1032 requests captured from traces, deploy history showing commit `afa6f51` "release: enable recommendation cache", and the live flag state (on). |
| early | Asked one customer-impact question. Nobody answered, so the run treated it as urgent and said so on the page. |
| after the readings | Most likely cause: the `recommendationCacheFailure` flag, supported by two independent readings and contradicted by none. |
| about 2 minutes | Reproduction in a sealed copy at 1x speed using the captured traffic: 101 requests, 1 out-of-memory kill, 1 failed request. The verifier accepted it against the checks recorded before the run. |
| then | Mitigation proposed: flag off plus a restart. |
| then | Verification: 3 of 3 rounds passed at 2x speed, each on a fresh copy. Each round's fix stage served 200 healthy requests with 0 failures, peak memory 9 to 10 percent of the limit. |
| 05:38:45 | Pull request [#3](https://github.com/Naaman-Saif/opentelemetry-demo/pull/3) opened on the shop fork: one line, `defaultVariant` from `on` to `off`. |
| 05:38:52 | Investigation stopped. Total 16 minutes 52 seconds. |

## How it works

1. **An incident opens.** A developer presses "Start investigation" on the operator page (`POST /op/api/investigations`), or Alertmanager posts to `/alerts`. Opening writes the first event, captures a traffic recipe from the last 20 minutes of frontend traces in Jaeger, and invokes the agents.
2. **The agents run a fixed order written in code** (`agent/src/investigation.ts`): read the failure rate and crashes, ask the impact question, read memory, CPU, logs, traces, deploy history and the live flag, propose possible causes, record the checks, reproduce, wait for the answer, propose a mitigation, verify, wait for the pull request, write the report, stop.
3. **Every reading is fetched by the server,** not by the model. Each read is a route under `/tool/incidents/:id/prod/*` that records an `evidence_recorded` event with the exact query and a link to Prometheus, Jaeger or GitHub. The model only sees what code fetched.
4. **The lead model proposes causes** from a block of those readings, each citing reading ids. Code then checks every cause (citations exist, numbers match the readings, a mechanism is stated) and drops the ones that fail.
5. **Experiments run in a sealed copy of the shop,** Docker Compose project `nc-sandbox`, started by a child process of the service. The copy has an internal network, no published ports, copied config and memory limits checked against production. It replays the captured traffic.
6. **Checks decide, not opinions.** The checks are picked from a fixed catalogue and recorded before the experiment starts. The investigator and verifier steps read the results and accept or reject by rule.
7. **After 3 of 3 verification rounds pass,** the service opens a pull request on the demo branch of the shop fork. The body is built from the event log: the question and answer, the reproduction checks, each round, the verifier's reasons, caveats, and what is not fixed.
8. **The page shows it live.** Every change is an event appended to `state/incidents/<id>/events.jsonl`; the service rebuilds `snapshot.json` after each append and streams events to the page. `/incidents/:id` is read only; `/op/incidents/:id` can answer the question.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the diagrams.

## Enforced by code, not by the model

- **Roles come from the token.** The lead, investigator and verifier each have their own bearer token. The server works out the role from the token, never from the request body, and each role has a short list of event types it may write. Evidence, experiment results, verification rounds, publication and finish are written only by the service itself and are refused over HTTP.
- **Operator writes need a header only Caddy adds** on `/op/api/*`. The public page cannot answer or start anything.
- **Every number is a cited reading.** Missing is written "not measured", zero is zero. The question quotes the measured failure rate; if it was not measured, the question is not built from a guess.
- **"Supported" needs two independent readings.** A cause is only marked most likely when readings from at least two different readers back it, nothing contradicts it, and no other cause ties it.
- **Checks are recorded before the run** and come from a fixed catalogue with bounded values (for example at least 1 out-of-memory kill in the fault stage, exactly 0 failures and at least 200 healthy requests in the fix stage). A second set of checks is refused.
- **No "verified" without 3 of 3.** The verifier cannot approve until rounds 1 to 3 of the same run have all passed. The pull request is refused without an approved 3 of 3 run.
- **The pull request is one line.** The diff builder refuses any change that touches more than one line of the flag file.
- **Production identity is checked before and after every round:** the flag file's SHA-256, the running recommendation image, and a checksum of its source. If anything changed, the round fails and the investigation stops as an infrastructure failure.
- **Sandbox writes go only to `nc-sandbox`.** Every Docker write goes through a guard that accepts only that project name.
- **30-minute budget.** The deadline is fixed when the incident opens. A watcher closes the tools, removes the copy and records "budget exhausted" with no pull request. The agents also stop starting new steps when time runs out, and skip an extra experiment that would end after minute 12.
- **One active real incident per service,** so a flapping alarm does not start twenty investigations.

## Models and hosting

- **Agents:** TypeScript Strands Agents SDK, hosted on Amazon Bedrock AgentCore Runtime in `us-west-1`. The same image also runs as a plain container (`nightcall-agents`) on the box as a fallback; the service picks the target from `NIGHT_CALL_AGENT_RUNTIME_ARN` (an ARN for AgentCore, an HTTP address for the container).
- **Models:** Featherless, through its OpenAI-compatible API. The lead uses `zai-org/GLM-5.3`, with `moonshotai/Kimi-K3` as the fallback after two failed attempts. Each role's model is a setting (`provider:modelId`), so Bedrock models can be switched in by configuration once the account allows them.
- **What uses a model:** only the lead, to propose possible causes from the readings and to classify a free-text answer to the question. The investigator and verifier steps, the checks, verdicts, 3 of 3 rule, identity checks and publication are plain code.
- **Everything else** runs on one Hetzner box: the shop in Docker Compose project `prod`, Prometheus, Jaeger, the NightCall service (NestJS), and Caddy serving the page on port 8001 and the tool API on port 8002. Both ports bind to 127.0.0.1; the agents reach 8002 through a Cloudflare quick tunnel.

## Running it

You need the OpenTelemetry Demo running under Docker Compose, a Featherless API key, a GitHub token for a fork of the demo, and Docker on the same host.

1. Clone the shop and apply the overlay from `astronomy-shop-overlay/` (Alertmanager, alert rules, the NightCall and status containers). Upstream files are not edited.
2. Copy `night-call/.env.example` to `night-call/.env` and fill in the settings: the three role tokens (`NIGHT_CALL_TOOL_TOKEN_LEAD`, `_INVESTIGATOR`, `_VERIFIER`), `NIGHT_CALL_OPERATOR_SECRET`, `NIGHT_CALL_AGENT_RUNTIME_ARN`, `NIGHT_CALL_ASTRONOMY_SHOP_PATH`, `NIGHT_CALL_FLAGD_CONFIG_PATH`, `NIGHT_CALL_RUNS_PATH`, `GITHUB_TOKEN` and `NIGHT_CALL_GITHUB_REPOSITORY`. Never commit this file.
3. From the shop folder, start only the NightCall containers without touching the shop:
   `docker compose -p prod -f compose.yaml -f compose.full.yaml -f compose.observability.yaml -f compose.nightcall.yaml up -d --build --no-deps night-call night-call-status`
4. Run the agents: either `docker build -t nightcall-agents night-call/agent` and run it on the shop network with `FEATHERLESS_API_KEY`, `FEATHERLESS_BASE_URL`, `NIGHT_CALL_LEAD_MODEL`, the role tokens and `TOOL_API_URL`, or deploy to AgentCore with `npm run deploy` in `night-call/agent`.
5. Turn the fault on: `docker exec night-call node dist/scripts/set-shop-flag.js on`. Wait a few minutes for crashes, open `http://127.0.0.1:8001/op/`, and press "Start investigation". Turn it off afterwards with `off`.

Checks: `npm run build`, `npm run lint` and `npm test` in `night-call/` and `night-call/agent/`; `npm run build`, `npm run lint` and `npm run typecheck` in `night-call/web/`.

## Limits and honest gaps

- **Bedrock models are blocked on our AWS account** ("Error 002: Access to Bedrock models is not allowed for this account"), so all model calls go to Featherless. AgentCore still hosts the agents.
- **The AgentCore agent quota was 0 in most regions** we tried, so the runtime lives in `us-west-1`. The deploy script and a settings default in the repo still name `eu-central-1`.
- **The tool API is reached through a temporary Cloudflare quick tunnel.** Its address changes on every restart and it has no uptime guarantee.
- **One incident type.** The demo handles the recommendation cache out-of-memory incident and fixes it by choosing an existing flag variant. It does not write code fixes.
- **Automatic alarms do not start investigations by default.** `NIGHT_CALL_INVOKE_AGENTS_ON_ALERT` is `false`; runs start from the button. The Alertmanager rules exist, and alerts for the recommendation service are silenced while the manual flow is the focus.
- **Only one model is involved.** The verifier is a set of code rules, not a second model.
- **A sandbox result is not a production fix.** The page and the pull request say "3/3 verification cycles passed under the recorded conditions". NightCall does not deploy the change.
- **Traffic fallbacks.** If no traces are found, the recipe falls back to the Prometheus request rate, then to a fixed 400 requests at 200 ms. The page says which source was used.
- **If no cause reaches two independent readings,** nothing is marked most likely and the first proposed cause is still tested in the copy, so the page shows it as a possible cause, not a supported one.
- **The "tolerable" path** (one extra experiment before the fix) is built but was not exercised in INC-015, because the question went unanswered.
- **Jaeger keeps traces in memory for about 20 minutes,** so the traffic recipe needs the investigation to start soon after the failures.

## Pre-existing code

- The shop is the upstream [OpenTelemetry Demo](https://github.com/open-telemetry/opentelemetry-demo) (Astronomy Shop). NightCall adds an overlay and does not edit its files; the only change to the fork is the demo branch with the bad release and the pull requests NightCall opens.
- NightCall's earlier prototype (a payment-failure pipeline with triage, remediator and reporter agents filing a GitHub issue, first committed 2026-09-11) predates the hackathon build and was replaced. Its modules (`src/pipeline`, `src/probes`, `src/report`, `src/agents`, `src/sandbox`) still compile but are not registered in the running application.
- `night-call/experiments/cache-proof/` is the Python feasibility runner used to confirm the incident could be reproduced; it was ported to TypeScript in `src/sandbox-copy/`.
- `night-call/web/src/design-system/` is the vendored NightCall design system.
