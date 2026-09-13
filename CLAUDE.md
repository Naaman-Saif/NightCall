# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NightCall investigates a production incident in the Astronomy Shop demo (OpenTelemetry Demo) and writes a live, evidence-backed incident report. The flagship incident is the recommendation service running out of memory when the `recommendationCacheFailure` flag is on. Product and interface intent: `night-call/docs/design/NIGHTCALL-DESIGN-BRIEF.md`. Step plans and decisions: `night-call/docs/phases/`, running log: `night-call/NOTES.md`.

`night-call/README.md`, `night-call/ARCHITECTURE.md` and the older parts of `night-call/PLAN.md` describe a superseded design (triage, remediator and reporter agents filing a GitHub issue). Trust the code and `docs/phases/` over them.

## Repository layout

- `night-call/` NestJS service (TypeScript, CommonJS build). The server, evidence readers, incident state, sandbox runner.
- `night-call/agent/` separate ESM package: the Strands agents that investigate. Runs as its own container.
- `night-call/web/` Vite + React 18 incident page, built into the Caddy `status` image.
- `night-call/status/` Caddyfile and Dockerfile for the page and proxy.
- `astronomy-shop-overlay/` compose overlay, Prometheus rules, Alertmanager and collector extras added to the shop without editing upstream files.
- `night-call/experiments/cache-proof/` the original Python feasibility runner; reference only.
- Legacy, unregistered from `AppModule`: `src/pipeline`, `src/probes`, `src/report`, `src/agents`, `src/sandbox` (old clone flow). They still compile; do not build on them.

## Commands

Service (`night-call/`):
- `npm run build`, `npm run lint`, `npm test` (Jest, roots in `src`)
- One test file: `npx jest src/investigation/investigation-stop.spec.ts`; by name: `npx jest -t "<part of the test name>"`

Agents (`night-call/agent/`):
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (node test runner on `src/*.test.ts`)
- One test file: `node --import tsx --test src/cause-rules.test.ts`

Web (`night-call/web/`):
- `npm run build`, `npm run lint`, `npm run typecheck` (no unit tests; checks happen in the browser)

## How a run works

1. An incident opens from `POST /op/api/investigations` (manual "Start investigation", labelled "Manually triggered") or `POST /alerts` (Alertmanager). Opening writes `alert_received`, captures a traffic recipe from the minutes before, and invokes the agents.
2. `src/runtime/runtime-invoker.ts` calls the agents: an HTTP URL in `NIGHT_CALL_AGENT_RUNTIME_ARN` targets the `nightcall-agents` container; a real ARN targets AgentCore (blocked: the AWS account has an AgentCore agent quota of 0 and no Bedrock model access).
3. `agent/src/investigation.ts` runs a fixed order in code: read failure rate and crashes, ask the one customer-impact question, read memory, CPU, logs, traces, deploy history and live flag state, propose possible causes, wait for the answer, write the report, post `investigation_stopped`. Models come from Featherless (OpenAI-compatible) per role setting `provider:modelId`.
4. Every read is a server route under `/tool/incidents/:id/prod/*` that records an `evidence_recorded` event with exact source links. The model only reads what code fetched.
5. Every change is an event appended to `state/incidents/<id>/events.jsonl`; `src/investigation/` rebuilds `snapshot.json` (including `runReport` and `headline`) after each append and streams events to the page.
6. The page (`/incidents/:id` public, `/op/incidents/:id` operator) reads the snapshot and the event stream.

## Rules the code enforces

- The event log is the single source of truth. Payloads are zod-validated per type; unknown fields are rejected, so a new field needs a contract change on both the service and agents.
- Roles come from the bearer token (`NIGHT_CALL_TOOL_TOKEN_LEAD`, `_INVESTIGATOR`, `_VERIFIER`), never from the request body. Each role has an allow list of event types; service-only events (evidence, experiments, cycles, publication, finish) are never accepted over HTTP.
- Operator writes need the `X-NightCall-Operator` header, which only Caddy adds on `/op/api/*`.
- One active real incident per service; test incidents (alert label `nightcall_test="true"`, `illustrative: true`) never block.
- Honest reporting: numbers quote readings exactly (missing is "not measured", zero is zero), shoppers' frontend error share comes before the backend span, a cause needs a mechanism and cited evidence, "supported" needs two independent readings and no contradiction, and nothing says reproduced, verified or fixed without the matching proof events.
- Sandbox writes go only to compose project `nc-sandbox` (`src/sandbox-copy/`), on an internal network with no ports, copied config and memory limits verified against production. Production identity (flag hash, image, source checksum) is compared before and after every round.

## Coding rules (from BRIEF.md, enforced by lint)

Zero comments. At most 20 lines per function, 2 parameters, 2 indent levels, 5 members per class, 100 lines per file. Plain names a non-engineer can read, predicates in positive form. No em dashes anywhere, including docs. One thing per file. The vendored design system in `web/src/design-system/` is exempt.

## The box

Everything runs on the Hetzner box `ssh-big.shipic.dev` (x86_64) inside the shop's compose project `prod`.
- Repo clone `/root/code/NightCall` (symlink `/root/code/night-call`); the box builds only from merged `main`.
- The compose file actually used is the copy at `/root/code/astronomy-shop/compose.nightcall.yaml`; copy the overlay there before deploying. Deploy one service without touching the shop, from `/root/code/astronomy-shop`:
  `docker compose --env-file .env --env-file .env.override -p prod -f compose.yaml -f compose.full.yaml -f compose.observability.yaml -f compose.box-override.yaml -f compose.nightcall.yaml up -d --build --no-deps night-call` (or `status`).
- `nightcall-agents` is a plain `docker run` container on network `opentelemetry-demo`; rebuild with `docker build -t nightcall-agents:x86 /root/code/night-call/agent` and recreate it with a temporary mode-600 env file.
- Induce or clear the real crash: `docker exec night-call node dist/scripts/set-shop-flag.js on|off` (writes the flag file in place; flagd reloads in under a second). Leave it off when done.
- Incident state lives in the Docker volume `prod_night-call-state` (`/var/lib/docker/volumes/prod_night-call-state/_data/incidents/`).
- The page is reached from the Mac through an SSH forward of ports 8001 (page) and 8080 (Grafana, Jaeger).

## Gotchas

- Restarting `night-call` interrupts any active incident and empties the 30-minute memory and CPU recorder. Check `GET /api/incidents` for an active incident first.
- Jaeger keeps traces only in memory (about 20 minutes). A large query restarts it and wipes them: read in pages of at most 500 with a bounded time window.
- Prometheus span metrics arrive about every 60 s; use `[2m]` windows or wider.
- `docker events --since/--until` history returns nothing on this box; NightCall's recorder keeps its own live subscription.
- `flagd-file.ts` must truncate and rewrite in place; a rename breaks the single-file bind mount.
- Automatic Alertmanager alerts for `service=recommendation` are silenced while the manual flow is the focus.
