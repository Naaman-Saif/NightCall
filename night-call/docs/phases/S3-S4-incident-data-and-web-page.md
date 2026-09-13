# Incident data and API, and the incident web page

Status: revised 2026-09-13 about 04:45 PKT after an independent Claude review (grill-me method; 4 blocking issues fixed). Waiting for Saif's approval. Nothing below has been run.

Part A turns alerts and agent events into a stored, typed incident the page can read live. Part B builds the incident page from the approved NightCall design system. They share one contract written in this file and one sample incident file.

## Saif's decisions (2026-09-13)

- Operator answers may be public. No public projection: `/api/*` returns the full snapshot and events. Only writes live under `/op/api/*`.
- Pre-approved cuts for the page: list filters, experiment detail drawer, separate operator screen (one screen; the answer box appears only on `/op/incidents/:id`). Phone layout stays in.

## Ownership and the box

- Part A owns `night-call/src/`, `night-call/scripts/`, root Jest and Docker ignore files, and the `night-call` container.
- Part B owns `night-call/web/`, `night-call/status/` and the `status` service block in `astronomy-shop-overlay/compose.nightcall.yaml`, and the `status` container.
- Claude (orchestrator) writes the sample incident file before either builder starts: `night-call/web/public/fixtures/sample-incident.json`, every event marked illustrative. Both parts read it; neither changes it without updating this doc.
- The box builds only from merged `main`. Order: Part A's branch is merged and deployed first (one restart window, announced); Part B then deploys the `status` image from merged main. Before Part A lands, Part B develops on the Mac against the sample file and an SSH port forward to the box's read routes (`ssh -L 8000:127.0.0.1:8000`).
- The box uses the compose copy at `/root/code/astronomy-shop/compose.nightcall.yaml`. Deploy = copy the overlay file there, then run from `/root/code/astronomy-shop`: `docker compose --env-file .env --env-file .env.override -p prod -f compose.yaml -f compose.full.yaml -f compose.observability.yaml -f compose.box-override.yaml -f compose.nightcall.yaml up -d --build --no-deps <service>`.
- Old test folders `state/incidents/{fallback,hello,long,restore}-01` (no `alert_received`) move to `state/archive/` at Part A's deploy; the list, reducer and boot check ignore any folder without `alert_received`.

## Decided (technical)

- **One source of truth.** `state/incidents/<id>/events.jsonl`. Order on every append: append the line, write `snapshot.json` to a temp file and rename, then publish to the live stream. Next sequence comes from the last valid event; a half-written last line is skipped.
- **Who may write which events.**
  - Lead (tool API): `brief_updated`, `hypothesis_proposed`, `hypothesis_status_changed`, `question_asked`, `role_status_changed`.
  - Investigator (tool API): `hypothesis_status_changed`, `mitigation_proposed`, `role_status_changed`.
  - Verifier (tool API): `experiment_reviewed`, `verification_reviewed`, `role_status_changed`.
  - Operator (operator API only): `context_supplied`.
  - Service only, never over HTTP: `alert_received`, `evidence_recorded` (written by the evidence readers), `contract_recorded`, `experiment_started`, `experiment_progress`, `experiment_finished`, `cycle_started`, `cycle_finished`, `publication_changed`, `budget_exhausted`, `investigation_finished`.
  - So an agent can never post a passed check, a passed cycle or a published PR.
- **Operator writes need Caddy.** Caddy adds header `X-NightCall-Operator: <secret from env>` on `/op/api/*`; Nest rejects operator writes without it (403). Anything else on the shop network, including the agents container, cannot post operator context. Saif's hosting login gates `/op/*` in front of Caddy.
- **Budget clock** starts when NightCall receives the alert; `deadlineAt` = received + 30 minutes.
- **Seeded values** go into `alert_received`: `label` (`INC-001` style), `deadlineAt`, and all three roles start `ready`.
- **Status rules live in the reducer only.** The page never recomputes them:
  - reproduction: `testing` on a reproduction `experiment_started`; `confirmed` on `experiment_reviewed` accepted for an experiment whose verdict is `matches`; `not_reproduced` when accepted with verdict `differs`; `inconclusive` for accepted `inconclusive`; a rejected review returns to `testing`.
  - mitigation status: `proposed` on `mitigation_proposed`; `testing` on first `cycle_started`; `failed` on any `cycle_finished` not passed; `verified` only when 3 cycles passed and `verification_reviewed` approved.
  - attention: `context_requested` while a question with `blocks: none` is open; `blocked` while one with `blocks: mitigation` is open.
  - phase: briefing until the first hypothesis; investigating; reproducing while a reproduction experiment runs; mitigating after `mitigation_proposed`; verifying during cycles; publishing on `publication_changed` publishing; handoff when finished.
  - lifecycle `finished` on `investigation_finished` or `budget_exhausted`.
- **Live stream.** Raw response writes (not Nest's `@Sse`): `flushHeaders`, `Cache-Control: no-cache, no-transform`, `id` = sequence, comment ping every 15 s. `Last-Event-ID` wins over `?after=`. Subscribe before replaying the file, drop duplicates by sequence. No gzip on the Caddy site. The page refetches the snapshot on each event; switching to 3 s polling is one setting in the hook.
- **Duplicate-alert block** comes from snapshots: an active incident with the same service and alert name blocks a new one. `incidents.json` is no longer consulted.
- **Recorder.** Every container in project `prod`, one-shot stats in parallel every 10 s, a tick is skipped while the previous one runs, 5 s timeout per call, 180 samples per service in memory. Memory = usage minus `inactive_file` (same fix applied to `sandbox-copy/observation.ts`). Limit is null when a container has none (Docker reports host memory). Reuses `sandbox-copy/cpu-percent.ts`; does not use the sandbox time-budget wrappers.
- **Production events.** Long-lived Docker events subscription for project `prod` (`oom`, `die`, `start`), reconnects with `since`, keeps 30 minutes.
- **Charts after an incident ends.** On finish, the recorder's window for the incident's service is saved to `state/incidents/<id>/series/prod-<service>.json`; the series route reads that file for finished incidents.
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
| cycle_started | `{ cycle }` |
| cycle_finished | `{ cycle, passed, checks: {name, passed, observed}[] }` |
| verification_reviewed | `{ approved, reasons }` |
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
cycles: { number, state: 'pending'|'running'|'passed'|'failed', checks }[]
verification: null | { approved, reasons }
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
| `POST /tool/incidents/:id/events` | agents, bearer | allow list per actor above; active incident only (409 otherwise) |
| `GET /tool/incidents/:id/prod/{logs,traces,memory,cpu,oom-events}` | agents, bearer | bounded readers; each read also records `evidence_recorded` |

## Part A: incident data and API

1. `src/investigation/`: event log (moved from tool-api), payload schemas, per-actor allow list, event reader (skips bad last line, ignores folders without `alert_received`), live stream, reducer split by area, status rules, snapshot writer (temp and rename), label counter, open-investigation, boot interruption, finish hook saving the series window.
2. `src/incidents/`: firing alert opens an investigation; duplicate block from snapshots; agent invoke only when `NIGHT_CALL_INVOKE_AGENTS_ON_ALERT=true` (default false).
3. `src/recorder/`: parallel sampler with skip-if-busy, ring buffer, series reader, production events buffer with reconnect; memory fix in `sandbox-copy/observation.ts`.
4. `src/public-api/` and `src/operator-api/` per the table; operator header guard.
5. `src/tool-api/`: append through investigation with the allow list and active guard; evidence reader routes that also record evidence.
6. `scripts/replay-sample-incident.ts`: reads the sample file and appends through the investigation service inside the container (not HTTP), with realistic spacing; run with `docker exec night-call node dist/scripts/replay-sample-incident.js`.
7. Hygiene: `.dockerignore`, Jest roots.
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
- Time: Part A about 4 to 5 hours; Part B about 5 to 6 hours with the approved cuts. Both land around 10:30 to 11:00 PKT if started by 05:00. Next gate 14:00 PKT.
