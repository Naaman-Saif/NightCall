# AI agents investigate, then proof and pull request

Status: drafted 2026-09-13 about 22:15 PKT from a planning pass. Waiting for an independent review. Product decisions below are Saif's; everything else is technical and reviewed without him. Nothing below has been run.

Correction to the planning pass: it read a stale local checkout and said main lacked the recorder, admission rules and sandbox fixes. Main (`624712a` at drafting time) has all of them. Step 0.1 of the pass is already done.

## Saif's product decisions (binding)

- The lead asks exactly one question, `q-impact`: "Recommendations are failing on about N in 100 requests. Is that tolerable while I test a fix, or should I rush the safest fix first?", `blocks: none`. N comes from the failure-rate reading, never from model text.
- Rush: straight to the safest mitigation and verification. Tolerable: one more experiment on the other hypothesis within budget, then mitigation. "I don't know" or no answer at the decision point: treat as rush and say so on the page. A later answer overrides, until verification starts.
- Agents choose bounded actions; code decides checks, verdicts, 3 of 3, deadline, identity and cleanup. Answers are public. The page leads with charts, then the story.

## Decided (technical)

- **Sandbox work runs in a child process per incident** (`dist/experiments/sandbox-worker.js`, JSON lines on stdin and stdout). The sandbox code keeps state in module globals (session, stop flag, time budget), so one abort must never poison the long-running NightCall process. Deadline = SIGTERM to the child; its existing handler aborts docker commands and tears down.
- **One incident per service.** All new alarm rules carry `service: recommendation`; the duplicate block matches service only; Alertmanager `group_by: ['service']`.
- **Deadline** always from `alert_received.deadlineAt`. Budget becomes setting `NIGHT_CALL_BUDGET_MINUTES` (default 30) so a 3 minute budget test is possible.
- **Code posts `q-impact`** with the lead's tool client after the lead's brief; the orchestrator re-reads the snapshot before every path decision, so a later answer wins.
- **Featherless retries:** fresh agent per attempt, 3 attempts, 2 s then 6 s backoff on stream-ended, connection reset, 429 and 5xx. Tool writes are idempotent (admission refuses repeats), so retries cannot duplicate events.

## Budget (minutes from alarm)

| Window | What happens | Enforced by |
|---|---|---|
| 0 | warm sandbox starts in the child | alert handler |
| 0 to 4 | lead reads failure rate, memory, crashes, deploy history; brief; up to 3 hypotheses; code posts q-impact | lead cap 12 tool calls, 4 min step timeout |
| 4 to 8 | investigator records the checks, runs the reproduction with the flag on | contract before start (409) |
| 8 to 9 | verifier reviews the reproduction | accept refused on a failed check |
| 9 to 12 | rush: mitigation now; tolerable: one extra experiment then mitigation | start refused if its estimate ends after minute 12 |
| by 13 | verification starts: 3 fresh-stack rounds, about 3.4 min each | start refused after minute 13; orchestrator starts it if the verifier did not |
| about 24 | verifier reviews the run; PR opens | approve refused unless rounds 1 to 3 passed in the current run |
| 30 | budget exhausted, sandbox removed, no PR | deadline watch |

## Tool routes (frozen contract), under `/tool/incidents/:id/`, role tokens, zod bounds

| Tool | Route | Role | Server writes (S = service-only) |
|---|---|---|---|
| case | `GET case` | all | none; condensed snapshot and minutes left |
| read failure rate, memory, cpu, crashes, logs, traces | `GET prod/...` (exist) | lead, investigator | `evidence_recorded` S |
| read_deploy_history | `GET prod/deploy-history` | lead | `evidence_recorded` S, kind deploy_history: last 5 fork commits on `nightcall-demo` touching the flag file, with commit time and patch |
| update_brief, propose_hypothesis, set_role_status | `POST events` (exists) | lead | brief, hypotheses (evidence ids must exist, max 3) |
| wait_for_context | `GET context?waitSeconds<=60` | lead | none |
| record_symptom_contract | `POST contract` | investigator | `contract_recorded` S; second contract 409 |
| start_experiment | `POST experiments` | investigator | `experiment_started` S, progress every 25 requests, `experiment_finished` S with seriesRef |
| poll_job | `GET jobs/:jobId?waitSeconds<=60` | investigator, verifier | none |
| read_experiment | `GET experiments/:experimentId/evidence` | investigator, verifier | none |
| propose_mitigation | `POST mitigations` `{variant, explanation, caveats, notFixed}` | investigator | `mitigation_proposed` with a code-built one-line diff |
| review_experiment | `POST experiments/:experimentId/review` | verifier | `experiment_reviewed` |
| start_verification | `POST verifications` | verifier | `verification_started` S, then `cycle_started` and `cycle_finished` S for rounds 1 to 3 |
| review_verification | `POST verifications/:runId/review` | verifier | `verification_reviewed`; publication follows an approval |
| retry publication | `POST /op/api/incidents/:id/publication/retry` | operator header | `publication_changed` |

Contract catalogue (fixed names, bounded values): `fault.oom_kills gte 1`, `fault.http_failures gte 1`, `mitigated.http_failures eq 0`, `mitigated.restarts eq 0`, `mitigated.healthy_requests gte 200..600`, `mitigated.peak_memory_share lte 0.5..0.9`.
Verdicts: matches (all stage checks passed), differs (a primary check failed), inconclusive (an observation is null), failed (infrastructure error).

## Server jobs (`src/experiments/`)

`sandbox-worker.ts` (child: start, experiment, cycle, stop), `worker-process.ts`, `job-registry.ts` (one job at a time), `evaluate-checks.ts` (pure, tested), `experiment-job.ts` (identity before and after; mismatch = failed and infrastructure_failure), `verification-job.ts` (new run id, stop warm stack, 3 fresh stacks, first failed round ends the run), `deadline-watch.ts` (closes tools with 409, SIGTERMs the child, waits for clean `cleanup.json`, appends `budget_exhausted`), `exploration-clock.ts`, controller and module. Alert handler starts the child and invokes agents with mode `investigate`; `NIGHT_CALL_INVOKE_AGENTS_ON_ALERT=true` is switched on last.

## Publication (`src/publication/`)

`github-api.ts`, `flag-diff.ts` (text-level `defaultVariant` change, refuses unless exactly one line differs; also builds the mitigation diff), `publish-pr.ts` (refuse unless verified and within budget; publishing event; branch `nightcall/<label>-<mitigationId>` from `nightcall-demo`; update the flag file; PR against `nightcall-demo`; published event with number, url, diff; `investigation_finished completed`; on error a failed event and the incident stays active for retry), `pr-body.ts` (from events only: alert, brief, q-impact and answer, reproduction checks, rounds 1 to 3, verifier reasons, caveats, not fixed, "3/3 verification cycles passed under the recorded conditions"), `publication.watcher.ts` (publish once per approved run).

## Agents (`agent/src/`)

Mode `investigate`; `toolClientFor(role)` keeps the token in a closure; per-role tool files mirroring server bounds with trimmed responses (max 6 KB); tool cap wrapper; retry wrapper; role builders and prompt constants; `investigation.ts` fixed order with role status events; `urgency.ts`; `phase-clock.ts`.

| Step | Cap |
|---|---|
| lead brief and hypotheses | 12 |
| code posts q-impact | none |
| investigator reproduce | 8 |
| verifier review | 4 |
| one revised experiment only if rejected and before minute 12 | none |
| urgency decision (code, lead classifies free-text answers) | none |
| investigator extra experiment, tolerable only | 6 |
| investigator mitigation | 3 |
| verifier starts verification | 2 |
| verifier reviews the run | 4 |
| lead handoff brief | 3 |

Prompts: lead reads failure rate, memory, crashes and deploy history before the brief, cites evidence ids, never says proven; investigator records checks first, reproduces on the original bad default before any fix, mitigation only picks an existing variant; verifier judges from checks, a missing observation is a reject reason, cannot pass a failed check.

## Scenario and alarms

- `scripts/deploy-bad-config.ts`: commits `defaultVariant: on` to `nightcall-demo` with message "release: enable recommendation cache", writes the same file into the box shop (flagd reloads in under a second), logs the sha; `--revert` moves `nightcall-demo` back to `2d1bc92` and writes `off` locally, for rehearsal resets.
- Box shop remote `fork` added; working tree stays at `2d1bc92`.
- Rules replace payment, ad and kafka: `RecommendationCrashed` (`resets(container_uptime_seconds{container_name="recommendation"}[2m]) > 0`), `RecommendationRequestsFailing` (span metrics error rate on ListRecommendations and the frontend route, `for: 1m`), `RecommendationCanaryFailing` (canary target down). Canary: collector httpcheck extras file listing both `http://frontend-proxy:8080` and the recommendations URL, mounted via the overlay. Confirm the httpcheck `http_url` label on the box before writing the rule.
- Sandbox cannot fire alarms: its collector exports metrics to debug only and its containers are `nc-sandbox-*`; checked below.

## Builders and deploy order

- Builder A (server): `src/experiments/`, `src/publication/` except `github-api.ts`, admission and open-investigation, incidents service, operator retry, case and context routes, settings, specs.
- Builder B (agents and scenario): `agent/`, `src/publication/github-api.ts`, deploy-history reader and route, `scripts/deploy-bad-config.ts`, `astronomy-shop-overlay/`, box model and URL settings.
- Starts after the chart and marker work on the page is merged. Box builds only from merged main.
- Deploy order: B rules, canary and Alertmanager; B github-api and deploy history; A jobs and routes; B agents image and container; A verification, deadline and publication; invoke on alert switched on last.

## Integration checkpoint (target about 01:30 PKT)

1. Live flag off, no sandbox; `npm run deploy-bad-config`.
2. Within 4 minutes: one alert, one `alert_received`, agents invoked, sandbox child started.
3. Page: failure rate, memory, crash and deploy-history evidence (with the commit sha), a brief citing them, 1 to 3 hypotheses, q-impact quoting N, markers on the chart.
4. Operator answers on `/op/`; stored once.
5. Contract, then a reproduction experiment with checks; the next brief or experiment reflects the answer.

## Done when (on the box)

| Check | Expected |
|---|---|
| One incident | crash, failing requests and canary together open exactly one incident |
| Rush | no extra experiment; verification starts before minute 13 |
| Tolerable | one extra experiment ending by minute 12 |
| I don't know | brief says treating as urgent; same path as rush; a later "tolerable" before verification is used |
| Guards | experiment before contract 409; second contract 409; verifier accepting a failed check 409; approve at 2 of 3 409; lead token on verification routes 403 |
| Retry safety | a forced Featherless stream error on the first attempt: step completes on retry, no duplicate events |
| 3 of 3 | rounds 1 to 3 passed with the same run, mitigation and contract ids; mitigation verified; three run folders with clean cleanup and matching memory limits |
| PR | real PR on the fork against `nightcall-demo`, one file, +1 -1 `defaultVariant`; body has checks and verifier reasons; published event; investigation completed |
| Budget | `NIGHT_CALL_BUDGET_MINUTES=3`: budget exhausted, no publication, no sandbox containers or network, tools 409 |
| Production | identity equal before and after every job; no alarm from sandbox runs; `--revert` restores off |
| Quality | lint, test, build in service, agent, web |

## Timeline (PKT)

| When | Work |
|---|---|
| Sun 22:15 to 23:00 | this doc reviewed; builders start after the chart and marker merge |
| 23:00 to 01:30 | A: child worker, registry, checks, experiment job, case, context, contract. B: rules, canary, deploy script, github-api, deploy history, tool clients, lead and investigator |
| 01:30 | integration checkpoint |
| 01:30 to 05:30 | A: verification, deadline, admission rules, publication. B: verifier, urgency, retry, caps, full orchestrator |
| 05:30 to 07:00 | 3 of 3 plus real PR run; 3 minute budget run; fixes |
| 07:00 to 09:00 | delete old modules; lint, test, build; rebuild containers |
| 09:00 | first hands-off run from alarm to PR, timed |
| 11:00 and 12:30 | rehearsals with Saif answering live; revert between runs |
| 13:30 to 14:00 | demo-critical fixes only, tag, clean tree, live flag off |

## Cut list (in order)

1. Fresh stack per round becomes force-recreate of recommendation on one sealed project.
2. Tolerable path's extra experiment becomes a lead evidence re-read.
3. Caps drop to lead 8, investigator 5, verifier 3; no handoff brief.
4. Trace excerpt dropped from read_experiment.
5. Publication retry button stays off the page (route stays).
6. If verification is unstable by 07:00: mitigated stage 300 requests.

Never cut: child-process isolation, identity checks, checks recorded before start, 3 of 3, deadline cleanup, the q-impact round trip, the automatic PR.

## Risks

- Tunnel URL changes on restart: rehearsal checklist re-reads it.
- Featherless latency eating minutes 0 to 4: step timeout, code posts q-impact anyway.
- Canary label shape: confirm on the box before writing the rule.
- Box shop drift: deploy script writes only the flag file; run it before the alarm, never during a job.
