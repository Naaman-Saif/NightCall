# Get everything ready

Status: plan revised after an independent Claude review (grill-me method, 2026-09-13). Waiting for Saif's answers and approval. Nothing below has been run.

## Goal

Start the build from a clean, pushed repo with every input the later steps need already proven: repo in sync, Codex's work committed, the new plan in place, a demo branch on the shop fork, the timing and alert signal known, and each agent role's model really calling a tool.

## Facts this step starts from (read-only, 2026-09-13)

| Fact | Value |
|---|---|
| Local HEAD vs GitHub | `7e3c832` vs `038d8f5`; the two GitHub commits change one line each in `package.json` (lint now `eslint src`) and `Dockerfile`. No overlap with local edits. |
| Box NightCall clone | `038d8f5`, clean |
| Box shop | commit `2d1bc92`, still pointing at upstream, has uncommitted overlay files |
| Fork `Naaman-Saif/opentelemetry-demo` | `main` is 2 dependency-bump commits ahead of `2d1bc92`; flag `recommendationCacheFailure` defaults `off` |
| Proof timing (result.json) | stack started once (about 1.8 min incl. teardown); each round: baseline 1.34 min, fault 0.39 to 0.47 min, mitigated 1.34 min, about 4.0 min; three rounds 13.9 min total |
| Memory before the crash | peaked at 47 percent of the 500 MiB limit, then an out-of-memory kill 23 to 28 s into the fault load. A memory-percentage alert cannot catch it. |
| Restart signal | `container_uptime_seconds{container_name="recommendation"}` resets on every restart. Labels are only `container_name` and `host_name`; sandbox copies report as `nc-cache-proof-recommendation` / `nc-sandbox-recommendation`, so the match must be exact. |
| Strands OpenAI provider | needs the `openai` npm package (peer ^6.45.0), not installed on Mac or box |
| Box `.env` | AWS keys, GitHub token, `FEATHERLESS_API_KEY` set; repo setting still `NaamanSaif/NightCall` |
| Old container | `night-call-status` still running; payment, ad and kafka alert rules still active |

## Steps

1. **Sync.** `git pull --ff-only`. Stop if not a fast-forward.
2. **Commit Codex's work.** Add `NightCall Design System.zip` to `.gitignore`. Commit design brief, `experiments/cache-proof/`, `pipeline.service.spec.ts`, NOTES.md, BOX-PROMPT edits. Message: `chore: checkpoint Codex design brief and cache feasibility proof`.
3. **Replace PLAN.md** with the approved build plan, removing the AWS account id, IAM user name, admin-key note and the fork token permission line. Add this file. Commit: `docs: replace phase plan with the NightCall build plan`.
4. **NOTES.md.** Record the corrected timing: stack starts once, each round about 4 min, three rounds 13.9 min; inside the 30 min investigation budget verification must start by minute 13, leaving about 1 min spare after the PR. Record model choice, fallbacks and alert signal. Commit: `docs: record cache proof timings, model choice and alert signal`.
5. **Alarm signals (read-only, record in NOTES).** Prometheus fires and Alertmanager calls NightCall when any of three deterministic rules is true. Rules and the canary target are written in the later "verification and PR" step; this step only confirms the exact selectors on the box:
   - **Crash:** `resets(container_uptime_seconds{container_name="recommendation"}[2m]) > 0`. Series confirmed on the box (`container_name`, `host_name` only). Exact name match so sandbox copies never trigger it.
   - **Failing requests:** `sum(rate(traces_span_metrics_calls_total{service_name="recommendation", span_name="oteldemo.RecommendationService/ListRecommendations", status_code="STATUS_CODE_ERROR"}[2m])) > 0`, with the same on frontend span `GET /api/recommendations`. Only UNSET series exist today because production has no errors; the ERROR series appears on first failure. Sandbox copies must be excluded by label (checked when the sandbox reports into Prometheus).
   - **Canary:** the collector already runs an httpcheck canary, but only against `http://frontend-proxy:8080` (home page). Add a second target `http://frontend-proxy:8080/api/recommendations?productIds=...` through the overlay (upstream files untouched); rule on `httpcheck_status{http_url=~".*/api/recommendations.*", http_status_class="5xx"} == 1` or `httpcheck_error`. One request per collection interval, negligible next to the ~100 requests that trigger the crash.
   - Prometheus `scrape_interval` is 60s, so expect up to about a minute from failure to alarm.
6. **Demo branch.** Confirm with `gh api repos/Naaman-Saif/opentelemetry-demo/compare/2d1bc92...main` that `2d1bc92` is in the fork's main history (a plain commit lookup is not proof, forks share objects with upstream). Create `nightcall-demo` at `2d1bc92`.
7. **Model smoke test.** Add `openai` to `package.json`. New `scripts/smoke-models.ts` plus `npm run smoke:models`: for each role, build the model from `provider:modelId`; load the OpenAI provider only when a role uses it, so the Bedrock check still runs if it breaks. One tool `read_number` returns 42; structured answer `{ number, sentence }`. Pass only if `read_number` is in the tool calls and `number === 42` (structured output alone is also a tool call, so it proves nothing). Mirror setting names in `.env.example`. Run `npx eslint scripts/smoke-models.ts` directly, since lint no longer covers `scripts/`. Script follows BRIEF rules: no comments, 20 lines per function, 2 parameters, 2 indents, 100 lines per file. Commit: `feat: model smoke test per agent role`.
8. **Push and prepare the box.** `git push`. On the box: `git -C /root/code/NightCall pull --ff-only`, `npm install`, then in `.env` set `NIGHT_CALL_GITHUB_REPOSITORY=Naaman-Saif/opentelemetry-demo`, `NIGHT_CALL_LEAD_MODEL=featherless:zai-org/GLM-5.3`, `NIGHT_CALL_INVESTIGATOR_MODEL=featherless:zai-org/GLM-5.3`, `NIGHT_CALL_VERIFIER_MODEL=bedrock:global.anthropic.claude-fable-5-1`, `FEATHERLESS_BASE_URL=https://api.featherless.ai/v1`. Do not recreate any running container.
9. **Run the smoke test on the box.** `npm run smoke:models`.

10. **Update BRIEF.md** (Saif, 2026-09-13) to match the build plan: three roles, AgentCore, automatic mitigation PR on the fork, provider-agnostic models (GLM-5.3 on Featherless, Fable 5.1 verifier), cache memory incident. Keep its coding rules section unchanged. Commit: `docs: bring BRIEF in line with the build plan`.

Saif's answers (2026-09-13): alarm fires on any of three deterministic signals: the recommendation service crashed and restarted, recommendation requests are failing, or a canary (a synthetic shopper request on a fixed schedule, like a CloudWatch canary) gets an error; add the `openai` package; update BRIEF.md now; leave the box host name and IP in git history.

## Not in this step

No app module changes, no old code deleted, no AgentCore work, no container recreated, no production flag change, no change to the box shop's git remote.

## Done when

| Check | Command | Expected |
|---|---|---|
| Repo matches GitHub | `git status -sb` | `## main...origin/main`, no staged or unstaged changes |
| Zip ignored | `git check-ignore "NightCall Design System.zip"` | prints the file name |
| Box on same commit | `git -C /root/code/NightCall log -1 --format=%h` | same sha as Mac |
| Demo branch | `gh api repos/Naaman-Saif/opentelemetry-demo/branches/nightcall-demo --jq .commit.sha` | starts with `2d1bc92` |
| Lead and investigator model | `npm run smoke:models` on box | GLM-5.3: `read_number` called, number 42 |
| Verifier model | same run | Fable 5.1: `read_number` called, number 42 |
| Script follows rules | `npx eslint scripts/smoke-models.ts` | exit 0 |
| Nothing else broke | `npm run lint && npm test` | exit 0 |
| No secrets committed | search the pushed commits for AWS key, Featherless key, GitHub token and AWS account patterns (patterns kept outside the repo) | nothing found |

## Risks

- GitHub moved again: stop, show the commits, ask.
- Featherless refuses a 4-unit model: record it; same model via OpenRouter or Bedrock, Saif picks.
- GLM-5.3 does not call `read_number`: retry once, then Kimi K3 on Featherless; record.
- Fable 5.1 invoke fails: GPT-6 Astra, then Opus 5, by settings only.

## Carried to later steps

- AgentCore must receive the Featherless key through its environment and reach Featherless; proven in the AgentCore step, not here.
- Box shop needs the fork as a git remote before the bad config can be deployed from `nightcall-demo`.
- Keep the proof run folder on the box as reference data for the runner port.
- BRIEF.md contradicts the new plan and the box host name and IP are in git history: Saif's call before the repo goes public.

Estimate: about 60 to 75 minutes after approval.
