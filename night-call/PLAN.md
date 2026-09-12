# NightCall build plan

Read BRIEF.md first. Product and interface detail live in `docs/design/NIGHTCALL-DESIGN-BRIEF.md`. Every build step gets its own plan in `docs/phases/`, a review, a walkthrough and Saif's explicit approval before anything is built.

## Context

Codex pivoted NightCall to the product in the design brief: an incident investigator with three roles (lead, experiment investigator, verifier), a live incident page, three of three sandbox verification rounds and an automatic mitigation PR. It then proved the flagship scenario on the box (run `20260912-cache-feasibility-01`, passed): `recommendationCacheFailure` on gives a Docker out-of-memory kill plus HTTP 500 after 107, 122 and 100 requests; flag off plus restart gives 400 of 400 healthy requests at about 47 MiB; production identity unchanged; sealed stack; clean teardown. The trace time-window query returned no traces (service and trace-id lookups work).

Goal: a working product for Devpost "Agents for Humans" (deadline Tue 2026-09-15 05:00 PKT). Product freeze Sun 2026-09-13 23:00 PKT. Saif records the video Monday evening PKT.

## Decisions

- Old payment, single hypothesis, GitHub issue pipeline is deleted once replaced.
- Agents pick bounded tool calls; deterministic runner owns reset, isolation, the pre-recorded symptom contract, the three of three rule, the 30 minute budget and cleanup.
- All three roles run in one Amazon Bedrock AgentCore runtime (TypeScript Strands, eu-central-1). Their tools call a bearer-token HTTPS tool API on the box.
- A real human question round trip is part of the demo.
- Mitigation PRs target fork `Naaman-Saif/opentelemetry-demo`, branch `nightcall-demo` (created at shop commit `2d1bc92`, the version running on the box).
- Web app: Vite React from the NightCall design system; Caddy serves static files; Nest serves the API. Operator routes live under `/op/`, gated by the hosting login; the backend does no auth there.
- Everything runs on the box; public domains are wired by Saif.
- Models are provider-agnostic: each role reads `provider:modelId` from settings. Lead and investigator use `featherless:zai-org/GLM-5.3`; verifier uses `bedrock:global.anthropic.claude-fable-5-1`. Fallbacks: Kimi K3 on Featherless, OpenRouter, GPT-6 Astra or Claude Opus 5 on Bedrock. Strands `OpenAIModel` with `api: 'chat'` and a custom `baseURL` covers any OpenAI-compatible host.
- Monday: scope AWS credentials on the box down before the repo goes public; confirm the submission period start to size the pre-existing code disclosure.

## Model research (2026-09-13)

Artificial Analysis Intelligence Index and Arena text: Fable 5.1 53; GPT-6 Astra 53 at max; Opus 5 51 / 1487; GLM-5.3 45 / 1486 (top open weights); Kimi K3 44 / 1485; DeepSeek V4.1 Flash 40; Qwen3.8 2.4T 40 (thinking always on); Sonnet 5 38. No open-weights model reaches Opus 5.

## Architecture

```
production shop (box): shopper traffic -> recommendation out of memory (bad flag default from nightcall-demo)
  Prometheus rules -> Alertmanager -> night-call:8000/alerts (compose network only)

Nest night-call container (box, docker socket, shop path mounted at the same path)
  incidents/     -> investigation/ (events.jsonl + reducer snapshot + SSE)
  recorder/      memory and CPU for every shop service every 10 s, last 30 min kept
  runtime/       InvokeAgentRuntime, returns at once
  tool-api/      /tool/* bearer token, active-incident guard, zod bounds
  sandbox/       TypeScript port of the cache-proof runner
  experiments/   symptom contract, check evaluator, three-round job, deadline
  publication/   GitHub PR on Naaman-Saif/opentelemetry-demo:nightcall-demo
  public-api/    /api/*    operator-api/ /op/api/*

AgentCore runtime: agent/ package (ESM), /invocations starts an async task
  orchestrator code -> lead -> investigator -> verifier, per-role tool allowlist
  every tool is an HTTPS call to the box; progress is posted back as events

Caddy (box): :8001 web build + /api + /op/api -> night-call:8000
             :8002 only /tool/* -> night-call:8000
```

Saif exposes `127.0.0.1:8001` (login on `/op/*`) and `127.0.0.1:8002` (bearer token). Never expose 8000, 9090, 9093 or 16686. The tools hostname is needed when AgentCore is connected, not at the end.

## Alarm

Prometheus fires when any of these is true:
- Crash: `resets(container_uptime_seconds{container_name="recommendation"}[2m]) > 0`, exact container name so sandbox copies never match.
- Failing requests: span metrics with `status_code="STATUS_CODE_ERROR"` on `oteldemo.RecommendationService/ListRecommendations` and on the frontend `GET /api/recommendations` span.
- Canary: a second collector httpcheck target on `/api/recommendations`, added through the overlay.

Memory reached only 47 percent of the limit before the kill in the proof, so a memory threshold is not a usable alarm.

## Module changes

- Keep: `config/{docker,hosts,settings}.ts`, `incidents/`, `evidence/{logs,traces}.ts` (traces by service and trace id), `sandbox/flagd-file.ts`.
- Delete during integration: `probes/`, `pipeline/`, `report/`, `agents/` (model and gate move to `agent/`), `sandbox/{actions,trial,replay,clone.service,sandbox.facade}.ts`, `evidence/{last-green,config-diff}*`, `status/`, `scripts/{signature,deploy-bot}.ts`, the clone part of `make-overlay.ts`, payment, ad and kafka rules, Makefile break and heal targets, and their specs.
- New Nest folders, one thing per file: `investigation/`, `recorder/`, `runtime/`, `tool-api/`, `sandbox/`, `experiments/`, `production/`, `publication/`, `public-api/`, `operator-api/`, `scripts/deploy-bad-config.ts`.
- `agent/`: `main.ts`, `investigation.ts`, `roles/{lead,investigator,verifier}.ts`, `model.ts`, `role-gate.ts`, `tool-client.ts`, `tools/*`, `progress.ts`.
- `web/`: vendored design system, `api/{client,use-incident-stream}.ts`, screens adapted from the design system app kit, routes `/incidents/:id` and `/op/incidents/:id`.

## State model

`state/incidents/<id>/events.jsonl` is the source of truth; `snapshot.json` is the reducer output; experiments and evidence are JSON files.
Event: `{id, incidentId, sequence, occurredAt, actor, type, summary, refs, payload}`.
Types: alert_received, brief_updated, evidence_recorded, hypothesis_proposed, hypothesis_status_changed, question_asked, context_supplied, contract_recorded, experiment_started, experiment_progress, experiment_finished, experiment_reviewed, mitigation_proposed, cycle_started, cycle_finished, verification_reviewed, publication_changed, role_status_changed, budget_exhausted, investigation_finished.
Cut from the design brief: diagnostic-only reproduction, brief revision history, context correction chains, per-evidence visibility classes (public view hides all human context text), multiple applications, readiness beyond a fixed checklist.

## Tool API

- Lead: `case`, `read_prod_logs`, `read_prod_traces`, `read_prod_memory`, `read_prod_cpu`, `read_prod_oom_events`, `read_deploy_history`, `update_brief` (evidence ids must exist), `propose_hypotheses` (max 3, each cites evidence), `ask_question` (one open at a time), `wait_for_context` (60 s max), `write_pr_summary`.
- Investigator: `record_symptom_contract` (fixed check catalogue, bounded tolerances), `start_experiment` (flag variant from the file, restart yes or no, 50 to 600 requests, 100 to 2000 ms pacing), `poll_job` (60 s max), sandbox memory, CPU, out-of-memory events, logs and traces, `propose_mitigation` (existing variant only).
- Verifier: `review_experiment`, `start_verification`, `review_verification`.
- Runner guards: one job at a time; contract recorded before start and never changed; isolation check before every start; compose refuses projects not named `nc-sandbox-*`; production identity checked before and after every job; code computes checks and rejects a verifier pass on a failed check; three of three on the same contract and mitigation; deadline aborts, cleans up and refuses later tools; cleanup failure blocks the next run; PR only when verified, approved by the verifier and within budget.
- Budget: sandbox warmed at alert time; exploration up to 12 minutes; verification starts by minute 13; PR within 2 minutes.

## Timing from the proof

The sandbox stack started once. Each round took about 4.0 minutes: baseline 1.34, fault 0.39 to 0.47, mitigated 1.34, plus restarts and idle. Three rounds took 13.9 minutes including stack start and teardown. Starting verification by minute 13 leaves about one minute spare inside 30 after the PR.

## How every step runs

1. Step plan in `docs/phases/`.
2. Review: Codex when available, otherwise an independent Claude reviewer.
3. Walkthrough page for Saif.
4. Saif approves explicitly. Nothing is built before this.
5. Build, then run the step's checks on the box and report the real output.

## Steps

| Step | Work | Done when (on the box) |
|---|---|---|
| Get everything ready | Sync, commit Codex work, this plan, NOTES, demo branch, alarm selectors, model smoke test, box settings, BRIEF | repo in sync, branch at `2d1bc92`, both role models call a tool and answer correctly |
| Connect the agents to AWS | `agent/` via AgentCore TypeScript CLI; hello async task with one model call, one tool call and one event; Nest bearer guard, ping, runtime invoker, Caddy :8002 | invoke produces a tool call and an event within 60 s; a 16 minute task survives |
| Sandbox copy of the shop | TypeScript runner port and `scripts/sandbox-cycle.ts` | one round shows the crash and failed request, mitigated peak under 80 percent of the limit, isolation valid, production unchanged, no leftovers |
| Incident data and API | investigation, recorder, public and operator API, evidence tools; alert opens an investigation; old pipeline module unregistered | fake alert creates a snapshot; event stream resumes without duplicates; public API never shows context text |
| Incident web page | web app from the design system, Caddy :8001 | live incident from replayed events; operator can answer a question; public view read-only |
| The agents | roles, tools, experiment job, question loop | an alert yields brief, cited hypotheses, a question, an operator answer and an experiment that cites it |
| Proof and pull request | three-round verification, deadline, PR publication, bad config deploy script, alarm rules and canary | three of three verified and a real PR changing only the flag default; a 3 minute budget run ends with no PR and an empty sandbox |
| Put it together | delete old code; lint, test and build everywhere; rebuild the container | one hands-off run from alarm to PR under 30 minutes, visible live |
| Rehearse and freeze | two more full runs, demo-critical fixes only, NOTES timings, tag | three runs logged, tag pushed, clean tree, production flag off |

Monday: README, architecture diagram, builder.aws post, Devpost draft, pre-existing code disclosure, repo made public, video recording in the evening, submit by Tue 03:00 PKT.

## Cut list, in order

1. Fresh stack per round becomes a recreate on one sealed project.
2. Experiment detail route becomes a drawer.
3. Readiness panel becomes a static card.
4. Publication retry button (endpoint stays).
5. Event stream becomes 3 s polling.
6. Mobile layouts and the incident list.
7. Sandbox trace evidence.
8. Free exploration becomes one agent-chosen experiment, then verification.

If AgentCore slips: run the same `agent/` package as a box container with the same `/invocations` contract and name the blocker in the README.
If the web page slips: one screen with team summary, question card, timeline, verification rounds and PR link.
Never cut: isolation check, production identity check, pre-recorded contract, three of three rule, 30 minute budget, the question round trip, the automatic PR.

## End-to-end check

1. Production healthy, no sandbox running, production flag off.
2. `npm run deploy-bad-config`; the recommendation service crashes within 2 minutes.
3. Alert visible in Alertmanager; `alert_received` in the event log; runtime invoke logged.
4. Operator page shows brief with deploy history, memory and CPU evidence, hypotheses and a question.
5. Answer; `context_supplied`, then an experiment citing it.
6. Crash reproduced; verifier review with reasons.
7. Mitigation proposed; rounds 1, 2 and 3.
8. PR on the fork against `nightcall-demo` with a one-line flag change.
9. No sandbox containers left; production identity unchanged.
10. Public page read-only, no context text.
11. Negative: short budget ends unresolved with no PR.
12. Every step: lint, test and build pass in the service, agent and web packages.

## Top risks

1. AgentCore setup takes longer than planned: do it first, fall back to a box container.
2. Three rounds plus exploration exceed 30 minutes: warm sandbox, stop fault stage at first failure, verification by minute 13.
3. Model wanders: fixed role order, allowlists, bounded tools, code-owned pass and fail, capped tool calls.
4. Container bind paths or sealed network: same-path run folder, network join, proven inside the container.
5. Alarm slow: one minute scrape interval; manual alert post as a disclosed fallback.
6. Tunnel cuts long requests: 60 s tool cap, stream flushing, polling fallback.
7. PR token or branch protection: throwaway PR test during the proof step.
