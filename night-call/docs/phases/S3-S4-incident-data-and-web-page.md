# Incident data and API, and the incident web page

Status: approved by Saif 2026-09-13 17:25 PKT after a Claude review and two Codex review passes. Codex's final note folded in (partial-write test order). Build starts after the sample incident file is written; Codex asks to review actual evidence at the integration checkpoint before charts and proof panels are finished.

Part A turns alerts and agent events into a stored, typed incident the page can read live. Part B builds the incident page from the approved NightCall design system. They share one contract written in this file and one sample incident file.

## Saif's decisions (2026-09-13)

- Operator answers may be public. No public projection: `/api/*` returns the full snapshot and events. Only writes live under `/op/api/*`.
- Pre-approved cuts for the page: list filters, experiment detail drawer, separate operator screen (one screen; the answer box appears only on `/op/incidents/:id`). Phone layout stays in.

## Codex review (2026-09-13 about 05:00 PKT), checked against code and the box

1. **Shutdown can race sandbox start: confirmed by code path.** `prepareSandbox` registers the session before `compose up`; the signal handler calls `stopSandbox` at once, so teardown runs while `up` still creates containers, then forgets the session, and `finish` finds nothing to stop. Fix: the signal handler only records the interrupt and aborts the in-flight docker command; teardown runs once, from the main flow, after the in-flight operation has settled; a final container check catches anything created late. Test with a signal sent during `up` on the box.
2. **Fault-stage traces are lost: confirmed on the box.** Run `20260913-ts-round-01` kept 300 traces, all from the mitigation stage; 0 of the 126 fault requests and 0 of 400 baseline requests have a trace. Fix: after each stage, fetch traces by the recorded trace ids from the sandbox Jaeger (every failed request plus up to 20 successful ones) into that stage's evidence folder, before the next stage starts.
3. **Memory limits copied from compose, not enforced from the live containers: no drift today, fix as a guard.** All 22 sandbox services' compose limits equal the live `HostConfig.Memory` exactly. Fix: write each service's limit from the inspected live value into the sandbox compose, and after `up` verify every sandbox container's `HostConfig.Memory` equals production; a mismatch fails the run.
4. **Proof is not tied to the mitigation it verifies: accepted.** Contract changes below: every cycle and verifier event carries `verificationRunId`, `mitigationId` and `contractId`; a new `mitigation_proposed` supersedes earlier proof; events for a run that is not the current one are refused.

Fixes 1 to 3 are in Part A (it owns `src/`). Fix 4 is in the shared contract and the reducer.

## Codex review, second pass (2026-09-13 about 05:15 PKT)

5. **Roles must be authoritative, not claimed.** Today the tool API has one shared token and takes `actor` from the request body, so a caller could claim to be the verifier. Accepted. Fix: three role tokens (`NIGHT_CALL_TOOL_TOKEN_LEAD`, `_INVESTIGATOR`, `_VERIFIER`); the server maps the token to the role and ignores any `actor` in the body. The agents' orchestrator code gives each role a tool client built with only that role's token; the model never sees or chooses a token.
6. **Recovery after a partial write.** Skipping a broken last line is not enough: the next append would join it. Accepted. Fix: writes are serialized per incident; before the first append after start, a broken tail is moved to `events.broken-<timestamp>.jsonl` and the log truncated to the last complete valid event; if `snapshot.json` is missing or its `lastSequence` differs from the log, it is rebuilt from the log.
7. **Keep the evidence from before the alert.** Saving the 30 minute window only at finish loses the climb before the alert, and a restart loses the memory buffer. Accepted. Fix: when an incident opens, the recorder's current window for the alerted service and its direct callers (frontend for recommendation) is written into the incident folder; while the incident is active every new sample and every production `oom`, `die` and `start` event for those containers is appended to files in the incident folder. Charts for finished or interrupted incidents read those files.
8. **Early integration checkpoint.** Accepted, see below.
9. **Estimate from the real start time.** Accepted, see Risks.

## Integration checkpoint (before charts and proof panels)

Both builders deliver the core first; Claude checks it on the box and reports before the rest continues:
alert opens an incident, page shows it, a question appears (posted with the lead token), the operator answers on `/op/`, the answer is stored once, the page updates live, and after a page reconnect and a `night-call` restart the full record, including the answer, is still there.
- Part A core: event log with recovery and per-incident serialization, role tokens, alert flow, reducer for incident, roles, brief and questions, stream, operator answer route, snapshot and list routes.
- Part B core: header, question column with the answer composer, timeline, connection state, served by Caddy.
- The sample replay is labelled illustrative everywhere; it tests the interface, not an autonomous investigation, which comes in the agents step.

## Ownership and the box

- Part A owns `night-call/src/`, `night-call/scripts/`, root Jest and Docker ignore files, and the `night-call` container.
- Part B owns `night-call/web/`, `night-call/status/` and the `status` service block in `astronomy-shop-overlay/compose.nightcall.yaml`, and the `status` container.
- Claude (orchestrator) writes the sample incident file before either builder starts: `night-call/web/public/fixtures/sample-incident.json`, every event marked illustrative. Both parts read it; neither changes it without updating this doc.
- The box builds only from merged `main`. Order: Part A's branch is merged and deployed first (one restart window, announced); Part B then deploys the `status` image from merged main. Before Part A lands, Part B develops on the Mac against the sample file and an SSH port forward to the box's read routes (`ssh -L 8000:127.0.0.1:8000`).
- The box uses the compose copy at `/root/code/astronomy-shop/compose.nightcall.yaml`. Deploy = copy the overlay file there, then run from `/root/code/astronomy-shop`: `docker compose --env-file .env --env-file .env.override -p prod -f compose.yaml -f compose.full.yaml -f compose.observability.yaml -f compose.box-override.yaml -f compose.nightcall.yaml up -d --build --no-deps <service>`.
- Old test folders `state/incidents/{fallback,hello,long,restore}-01` (no `alert_received`) move to `state/archive/` at Part A's deploy; the list, reducer and boot check ignore any folder without `alert_received`.

## Decided (technical)

- **One source of truth.** `state/incidents/<id>/events.jsonl`. Order on every append: append the line, write `snapshot.json` to a temp file and rename, then publish to the live stream. Writes are serialized per incident. Before the first append after start, a broken tail is moved to `events.broken-<timestamp>.jsonl` and the log is truncated to the last complete valid event; a missing or stale `snapshot.json` (lastSequence differs from the log) is rebuilt from the log. Next sequence comes from the last valid event.
- **Who may write which events.**
  - Lead (tool API): `brief_updated`, `hypothesis_proposed`, `hypothesis_status_changed`, `question_asked`, `role_status_changed`.
  - Investigator (tool API): `hypothesis_status_changed`, `mitigation_proposed`, `role_status_changed`.
  - Verifier (tool API): `experiment_reviewed`, `verification_reviewed`, `role_status_changed`.
  - Operator (operator API only): `context_supplied`.
  - Service only, never over HTTP: `alert_received`, `evidence_recorded` (written by the evidence readers), `contract_recorded`, `experiment_started`, `experiment_progress`, `experiment_finished`, `verification_started`, `cycle_started`, `cycle_finished`, `publication_changed`, `budget_exhausted`, `investigation_finished`.
  - So an agent can never post a passed check, a passed cycle or a published PR.
  - The role comes from the token, never from the request: three role tokens map to lead, investigator and verifier; any `actor` field in the body is ignored.
- **Operator writes need Caddy.** Caddy adds header `X-NightCall-Operator: <secret from env>` on `/op/api/*`; Nest rejects operator writes without it (403). Anything else on the shop network, including the agents container, cannot post operator context. Saif's hosting login gates `/op/*` in front of Caddy.
- **Budget clock** starts when NightCall receives the alert; `deadlineAt` = received + 30 minutes.
- **Seeded values** go into `alert_received`: `label` (`INC-001` style), `deadlineAt`, and all three roles start `ready`.
- **Status rules live in the reducer only.** The page never recomputes them:
  - reproduction: `testing` on a reproduction `experiment_started`; `confirmed` on `experiment_reviewed` accepted for an experiment whose verdict is `matches`; `not_reproduced` when accepted with verdict `differs`; `inconclusive` for accepted `inconclusive`; a rejected review returns to `testing`.
  - mitigation status: `proposed` on `mitigation_proposed`; `testing` on `verification_started` for that mitigation; `failed` on any `cycle_finished` not passed in the current run; `verified` only when cycles 1, 2 and 3 all passed with the same `verificationRunId`, `mitigationId` and `contractId` as the current run, and `verification_reviewed` approved that same run.
  - proof is tied to one run: `verification_started` opens a new current run and clears `cycles` and `verification`; a new `mitigation_proposed` supersedes the current mitigation, clears its cycles and verification, and records the old one as superseded. Cycle or verifier events whose ids do not match the current run are refused on append (409) and never counted by the reducer. `publication_changed` publishing is refused unless the mitigation is `verified`.
  - attention: `context_requested` while a question with `blocks: none` is open; `blocked` while one with `blocks: mitigation` is open.
  - phase: briefing until the first hypothesis; investigating; reproducing while a reproduction experiment runs; mitigating after `mitigation_proposed`; verifying during cycles; publishing on `publication_changed` publishing; handoff when finished.
  - lifecycle `finished` on `investigation_finished` or `budget_exhausted`.
- **Live stream.** Raw response writes (not Nest's `@Sse`): `flushHeaders`, `Cache-Control: no-cache, no-transform`, `id` = sequence, comment ping every 15 s. `Last-Event-ID` wins over `?after=`. Subscribe before replaying the file, drop duplicates by sequence. No gzip on the Caddy site. The page refetches the snapshot on each event; switching to 3 s polling is one setting in the hook.
- **Duplicate-alert block** comes from snapshots: an active incident with the same service and alert name blocks a new one. `incidents.json` is no longer consulted.
- **Recorder.** Every container in project `prod`, one-shot stats in parallel every 10 s, a tick is skipped while the previous one runs, 5 s timeout per call, 180 samples per service in memory. Memory = usage minus `inactive_file` (same fix applied to `sandbox-copy/observation.ts`). Limit is null when a container has none (Docker reports host memory). Reuses `sandbox-copy/cpu-percent.ts`; does not use the sandbox time-budget wrappers.
- **Production events.** Long-lived Docker events subscription for project `prod` (`oom`, `die`, `start`), reconnects with `since`, keeps 30 minutes.
- **Evidence kept from before the alert.** When an incident opens, the recorder's current window for the alerted service and its direct callers (frontend for recommendation) is written to `state/incidents/<id>/series/prod-<service>.jsonl`; while the incident is active, each new sample and each production `oom`, `die` and `start` event for those containers is appended there (`series/prod-events.jsonl`). The series route reads the incident files, so finished and interrupted incidents keep their charts.
- **Route safety.** `:id` checked with the existing id shape on every route. Series routes: service allow list, minutes 1 to 30.
- **Settings.** No settings removed in this step; dead fields leave with the old code.
- **Hygiene.** `.dockerignore` adds `**/node_modules` and `web/dist`. Root Jest roots limited to `src`.
- **Web stack.** Vite, React 18, TypeScript, `@types/react` pinned to 18.3.31. Design system vendored from the approved zip into `web/src/design-system/` as third-party code outside caps and lint. Edits to vendored files limited to: icon URL constant to `/icons/`, remove the Google fonts import. Font via `@fontsource/ibm-plex-sans`; used Lucide icons copied to `web/public/icons/`.
- **Own answer composer** (the kit's QuestionCard clears the draft and has no pending or failed states): draft kept on errors, pending, accepted, failed, retry with the same idempotency key, "I don't know".
- **Kit behaviour corrected.** "Mitigation verified" only from the snapshot's `verified`. No manual PR, pause or discard buttons. `demo={false}` on live data; demo badge when events are marked illustrative. `MetricChart` gets null values filtered out.
- **Caddy `:8001`.** Explicit 404 for `/alerts*` and `/tool/*` first; `/api/*` and `/op/api/*` (with the operator header) to `night-call:8000`; everything else `try_files {path} /index.html`. Two-stage image: Node builds `web/dist`, Caddy serves it; `web/dist` is not committed.

## Shared contract

### Events

`{ id, incidentId, sequence, occurredAt, actor, type, summary, refs, payload }`. Payloads are validated per type; unknown fields are rejected. Any event may carry `payload.illustrative: true`.

| type | payload |
|---|---|
| alert_received | `{ label, alertName, service, severity, startedAt, deadlineAt, labels }` |
| brief_updated | `{ summary, knownFacts: {text, evidenceIds}[], unknowns: string[], nextStep }` |
| evidence_recorded | `{ evidenceId, kind: 'logs'|'traces'|'memory'|'cpu'|'oom_events'|'deploy_history'|'sandbox', source, summary, observedAt, excerpt }` |
| hypothesis_proposed | `{ hypothesisId, claim, supportingEvidenceIds, contradictingEvidenceIds, predicted }` |
| hypothesis_status_changed | `{ hypothesisId, status: 'testing'|'supported'|'contradicted'|'inconclusive'|'superseded', reason }` |
| question_asked | `{ questionId, text, whyItMatters, meanwhile, blocks: 'none'|'mitigation' }` |
| context_supplied | `{ questionId: string or null, text, idempotencyKey }` |
| contract_recorded | `{ contractId, checks: {name, comparator: 'gte'|'lte'|'eq', value, unit}[] }` |
| experiment_started | `{ experimentId, kind: 'reproduction'|'mitigation', hypothesisId, contractId, purpose, recipe: {flagVariant, restart, count, pacingMs, stopOnFailure} }` |
| experiment_progress | `{ experimentId, requests, errors, peakMemoryBytes, peakCpuPercent }` |
| experiment_finished | `{ experimentId, verdict: 'matches'|'differs'|'inconclusive'|'failed', checks: {name, passed, observed}[], seriesRef }` |
| experiment_reviewed | `{ experimentId, accepted, reasons }` |
| mitigation_proposed | `{ mitigationId, explanation, diff, caveats, notFixed }` |
| verification_started | `{ verificationRunId, mitigationId, contractId }` (service only) |
| cycle_started | `{ verificationRunId, mitigationId, contractId, cycle }` |
| cycle_finished | `{ verificationRunId, mitigationId, contractId, cycle, passed, checks: {name, passed, observed}[] }` |
| verification_reviewed | `{ verificationRunId, mitigationId, contractId, approved, reasons }` |
| publication_changed | `{ state: 'publishing'|'published'|'failed', repository, baseBranch, number, url, diff, failureReason }` |
| role_status_changed | `{ role, status: 'ready'|'working'|'waiting_for_evidence'|'waiting_for_context'|'reviewing'|'finished', assignment }` |
| budget_exhausted | `{ deadlineAt }` |
| investigation_finished | `{ reason: 'completed'|'insufficient_evidence'|'infrastructure_failure'|'interrupted' }` |

Counts: `count` 50 to 600, `pacingMs` 100 to 2000.

### Snapshot

```
incident: { id, label, service, alertName, severity, startedAt, lastActivityAt, deadlineAt, illustrative,
            lifecycle: 'active'|'finished', phase, attention: 'none'|'context_requested'|'blocked',
            completionReason: null|'completed'|'budget_exhausted'|'insufficient_evidence'|'infrastructure_failure'|'interrupted' }
brief: null | { summary, knownFacts, unknowns, nextStep, updatedAt }
roles: { lead|investigator|verifier: { status, assignment, updatedAt } }
evidence: { [evidenceId]: { kind, source, summary, observedAt, excerpt } }
hypotheses: { id, claim, status, supportingEvidenceIds, contradictingEvidenceIds, predicted, reason }[]
questions: { id, text, whyItMatters, meanwhile, blocks, askedAt, answer: null | { text, suppliedAt } }[]
context: { questionId, text, suppliedAt }[]
contract: null | { id, checks }
experiments: { id, kind, hypothesisId, contractId, purpose, recipe, startedAt, finishedAt, progress, verdict, checks, review, seriesRef }[]
reproduction: 'untested'|'testing'|'confirmed'|'not_reproduced'|'inconclusive'
mitigation: null | { id, explanation, diff, caveats, notFixed, status: 'proposed'|'testing'|'verified'|'failed' }
supersededMitigations: { id, explanation, supersededAt }[]
currentVerificationRun: null | { verificationRunId, mitigationId, contractId, startedAt }
cycles: { number, state: 'pending'|'running'|'passed'|'failed', checks, verificationRunId }[]
verification: null | { verificationRunId, approved, reasons }
publication: { state: 'not_eligible'|'publishing'|'published'|'failed', repository, baseBranch, number, url, diff, failureReason }
lastSequence
```

### HTTP

| Route | Access | Returns |
|---|---|---|
| `POST /alerts` | compose network only | 202 `{ opened }` |
| `GET /api/incidents` | public | `{ id, label, service, alertName, startedAt, lifecycle, attention, phase, reproduction, publication, illustrative }[]` newest first |
| `GET /api/incidents/:id` | public | snapshot |
| `GET /api/incidents/:id/events` | public | event stream |
| `GET /api/incidents/:id/series?service=&minutes=` | public | `{ service, limitBytes, samples: {at, memoryBytes, cpuPercent}[] }` |
| `GET /api/incidents/:id/experiments/:experimentId/series` | public | same shape from `seriesRef` (empty until the proof step writes it) |
| `POST /op/api/incidents/:id/context` | operator header required | `{ questionId, text, idempotencyKey }` to 201 event; repeat key returns the same event |
| `POST /tool/incidents/:id/events` | agents, role token | role taken from the token; allow list per role above; active incident only (409 otherwise) |
| `GET /tool/incidents/:id/prod/{logs,traces,memory,cpu,oom-events}` | agents, bearer | bounded readers; each read also records `evidence_recorded` |

## Part A: incident data and API

1. `src/investigation/`: event log (moved from tool-api), payload schemas, per-actor allow list, event reader (skips bad last line, ignores folders without `alert_received`), live stream, reducer split by area, status rules, snapshot writer (temp and rename), label counter, open-investigation, boot interruption, write serialization and tail recovery, role tokens, series freeze at open and persistence while active.
2. `src/incidents/`: firing alert opens an investigation; duplicate block from snapshots; agent invoke only when `NIGHT_CALL_INVOKE_AGENTS_ON_ALERT=true` (default false).
3. `src/recorder/`: parallel sampler with skip-if-busy, ring buffer, series reader, production events buffer with reconnect; memory fix in `sandbox-copy/observation.ts`.
4. `src/public-api/` and `src/operator-api/` per the table; operator header guard.
5. `src/tool-api/`: append through investigation with the allow list and active guard; evidence reader routes that also record evidence.
6. `scripts/replay-sample-incident.ts`: reads the sample file and appends through the investigation service inside the container (not HTTP), with realistic spacing; run with `docker exec night-call node dist/scripts/replay-sample-incident.js`.
7. Hygiene: `.dockerignore`, Jest roots.
7a. Sandbox fixes from the Codex review, in `src/sandbox-copy/`: signal handler records the interrupt and aborts the in-flight docker command only; teardown runs once from the main flow after the in-flight operation settles, then a final project-container check; stage evidence fetches traces by recorded trace ids (all failed requests plus up to 20 successful) right after each stage; sandbox compose takes memory limits from the inspected live containers and a post-start check fails the run on any mismatch.
8. Tests: reducer and status rules per area, allow list, operator header, idempotent context, stream resume without duplicates, bad last line, ring buffer and skip-if-busy, limit null, boot interruption.

### Done when (Part A, on the box)

| Check | Expected |
|---|---|
| Fake alert | Alertmanager body with `labels.service=recommendation` posted to `night-call:8000/alerts` from inside the network: 202; `alert_received` sequence 1 with label and deadline; snapshot `lifecycle: active`, phase `briefing`, three roles `ready` |
| Replay | sample incident replayed: snapshot has brief, 2 hypotheses, one answered question, reproduction `confirmed`, 3 passed cycles, mitigation `verified`, publication `published`, `illustrative: true` |
| Stream | `curl -N .../events?after=0` streams everything; reconnect with `Last-Event-ID: 5` resumes at 6 with no duplicates; ping lines every 15 s |
| Allow list | lead posting `cycle_finished` gets 403; any agent posting `context_supplied` gets 403; posting to a finished incident gets 409 |
| Operator | POST to `night-call:8000/op/api/.../context` without the header gets 403; with it, same idempotency key twice creates one event |
| Recorder | after 2 minutes, series for `recommendation` has at least 12 samples with non-null memory, limit and CPU; `night-call` series has limit null |
| Interruption | restarting `night-call` with an active incident appends `investigation_finished` reason `interrupted` |
| Old folders | archived; list shows only incidents with `alert_received` |
| Proof tied to one run | appending a `cycle_finished` with a stale `verificationRunId` gets 409; a new `mitigation_proposed` clears cycles and verification in the snapshot; `publication_changed` publishing before `verified` gets 409 |
| Signal during start | SIGTERM sent to the one-off runner while `compose up` runs: exit non-zero, `cleanup.json` clean, no `nc-sandbox` containers or network left afterwards |
| Stage traces | a new one-round run keeps traces whose ids match at least one failed fault-stage request, stored in the fault stage's evidence folder |
| Memory limits | the same run's post-start check shows every sandbox container's memory limit equals production |
| Roles from tokens | lead token posting `verification_reviewed` with body `actor: verifier` gets 403 |
| Partial write | an operator answer is saved first; then a half-written line is planted after it and `night-call` restarted (the restart also marks the incident interrupted); after recovery the answer is in the log exactly once, the broken tail is in `events.broken-*.jsonl`, the next sequence follows the last valid event, and the snapshot matches the log |
| Pre-alert evidence | an incident opened after 10 minutes of recording, then interrupted by a restart, still returns series samples from before its alert time |
| Integration checkpoint | the flow in the checkpoint section passes on the box before charts and proof panels are finished |
| Quality | lint, tests, build pass |

## Part B: incident web page

1. `web/` Vite React 18 TypeScript package with its own lint config (caps on `src/` except `src/design-system/`).
2. Vendor the design system with the two allowed edits; self-host font and icons.
3. `src/api/`: typed client, `use-incident-stream` hook (snapshot plus stream, refetch on event, connection state live, reconnecting or stale, polling switch), sample mode `?fixture=sample` replaying the sample file in the browser.
4. `src/format/`: snapshot to component props; claim labels from snapshot fields only; times, bytes, budget left.
5. One incident screen as TSX: header (label, service, started, elapsed, budget left, phase, connection state, read-only banner on public), living brief, roles strip, question column (answer box only on `/op/`), hypotheses, experiment summary cards, memory and CPU charts from the series routes with the limit line, verification cycles, result and PR state, timeline including runner, system and operator events. Plus `/incidents` list without filters.
6. Answer composer as decided.
7. Caddy site and two-stage image per the decided section; compose `status` build context.
8. Phone layout: header, question, latest activity and result first; no horizontal scroll at 400 px.

### Done when (Part B, on the box after Part A is deployed)

| Check | Expected |
|---|---|
| Sample mode | `/incidents/sample?fixture=sample` renders every section with the demo badge |
| Live incident | during Part A's replay, `/incidents/<id>` updates within 2 s of each event without reload |
| Operator answer | on `/op/incidents/<id>` the answer becomes a `context_supplied` event; card shows accepted; a forced failure keeps the draft |
| Rules | 2 of 3 cycles shows in progress, never verified; no manual PR, pause or discard buttons |
| Connection | stopping `night-call` shows reconnecting, then stale with data kept; restart recovers without duplicate timeline rows |
| Surface | `127.0.0.1:8001/alerts` and `/tool/ping` return 404; `/op/api` requests carry the operator header via Caddy |
| Screenshots | Playwright at 1440 and 400 px attached; no horizontal scroll at 400 |
| Quality | web lint, typecheck, build pass; service tests unaffected |

## Not in these steps

No real agent roles or prompts, no symptom contract enforcement, no experiment or verification jobs, no PR publication, no deploy-bad-config, no alarm rules, no deletion of old pipeline files, no AgentCore deploy.

## Risks

- Contract drift between parts: only this doc and the sample file are the interface.
- Stream through Cloudflare later: pings; polling switch.
- Design kit surprises: vendor first thing; tokens only, no raw colours.
- Time, counted from the actual start (recorded when builders launch): integration checkpoint about 3 hours after start; Part A complete about 5 to 6 hours after start (the two review passes added work); Part B complete about 6 hours after start with the approved cuts. The next gate stays 14:00 PKT; if either part is not complete by then, the cut list applies.
