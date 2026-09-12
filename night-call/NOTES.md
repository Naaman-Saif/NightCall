# Night Call, running log

Timings and decisions. This file is the source for the builder.aws.com post.

## Thu Sep 10

- Renamed the project from Night Shift to Night Call. BRIEF.md and PLAN.md carry the new name.
- Design pass done before any code: product definition, the four outcome paths, and the ICP live on a Claude Design canvas.
- Corrections that came out of the design pass and are now reflected in BRIEF.md:
  - Disk fill dropped from the in scope list. It is not visible in a config diff and none of the four actions address it. Replaced with a wrong image tag pinned in the compose file.
  - The vocabulary is four actions, but only three are ever trialled. `set_flag` with a novel value is written down and never run.
  - There are three outcomes, not four. Needs a human is a section that can appear alongside any of them.
- Repository skeleton created: package tree, `config.py`, `preflight.py`, Makefile, Apache 2.0 license, env template.
- `config.py` is the single place the model id, region, project names and endpoints live. `project_accepts_writes` is the one function that decides whether a project may be mutated, and only the sandbox is in that set.

### Open before Phase 1

- Bedrock model id not pinned yet. Needs `aws bedrock list-foundation-models` in eu-central-1, with us-east-1 as the fallback.
- Both GitHub repositories still to be created and pushed.
- Box not touched yet: architecture check, image pull time, cold clone time all unrecorded.
- The ad service CPU fault is the planned second demo. It is a load shaped fault by nature, so whether it replays in a cold copy is the first thing to test once the stack is up. If it does not, the second demo fault has to change.

## Thu Sep 10, later

- Switched from Python to TypeScript on NestJS. The Strands TypeScript SDK carries both features the design depends on: the Graph multi-agent pattern and the `BeforeToolCallEvent` hook that enforces the action vocabulary. Only gap found in the docs is conditional graph edges with runtime context, which is Python only and which we do not use, since the routing between agents is deterministic code rather than graph conditions.
- Go and Rust ruled out: Strands ships no SDK for either, and the hackathon requires the SDK.
- Standing risk: the TypeScript SDK is still labelled preview. First thing to run on the box is `npm run smoke:bedrock`. If it does not complete one round trip, fall back to Python before any more code is written.
- Python scaffold moved to `_python_scrapped/` rather than deleted, so the fallback is a directory move.
- `ARCHITECTURE.md` added: module boundaries, and the two functions in `config` that carry the whole safety story.

## Night of Thu Sep 10 to Fri Sep 11, built while Saif slept

Phases 1 to 5 are written, compile, lint clean under the caps, and pass 15 unit tests. Nothing has run against a real stack yet. Everything below is the order to verify it in.

### What exists

- `astronomy-shop-overlay/`: Alertmanager, three Prometheus alert rules, `compose.nightcall.yaml` (Alertmanager, rule mount, the Night Call container, a Caddy status page on 8001). `npm run overlay -- <shop>` generates `prometheus-nightcall.yaml` and `compose.clone.yaml` from the upstream files, so nothing upstream is edited.
- `incidents/`: `POST /alerts` accepts the Alertmanager webhook, dedupes on service plus alertname while an incident is open or running, stores to `state/incidents.json`. Verified live: 202, duplicate dropped, bad body 400, worker picks it up.
- `evidence/`: container logs via the Docker socket, error spans via the Jaeger HTTP API, flag diff against `state/snapshots/last-green.json`, which a watcher refreshes every 30s while production is green.
- `probes/`: frontend GET, a real cart plus checkout call, three Prometheus instant queries, container restart counts. A signature is the set of failing probes. Signatures match on which probes fail, not on exact values.
- `sandbox/`: `docker compose -p clone` with the three base files plus `compose.clone.yaml`, flagd seeded from the last green snapshot, Night Call joins the clone network, waits for green, replays the diff, trials candidates. Teardown always runs.
- `agents/`: triage (three read only tools, structured hypothesis), remediator (proposes via a `propose_candidate` tool call so the `BeforeToolCallEvent` gate is real), reporter (writes only the prose; every table in the issue is rendered from data).
- `report/`: issue body renderer, GitHub REST filing, run records plus `state/runs/index.json` for the status page.

### Decisions taken without you, reverse any over coffee

1. `scale_replicas` is gone from the vocabulary. The demo pins every `container_name`, and Docker refuses to scale a service with a fixed name, so the action could never run here. Vocabulary is now revert_flag, restart_service, set_flag. BRIEF, README and ARCHITECTURE say so. The canvas still says four in a couple of places.
2. Night Call runs as a container inside the shop's compose project, not as a host process. Reason: Alertmanager in a container cannot reach a host process bound to 127.0.0.1, and ufw default deny blocks the bridge anyway. In the compose network everything resolves by name and the Docker socket is mounted.
3. Prometheus, Jaeger and the frontend are addressed by container IP, resolved through the socket, not by DNS name. When Night Call is on both the prod and clone networks, the service name `prometheus` exists on both and Docker's resolver does not promise which one you get.
4. Metric probes use a 1m rate window and trials look twice, 20s then 60s after applying. With a 2m window a working revert would have read as unchanged.
5. The clone network is `internal: true`, so the sandbox has no egress.
6. An incident closes when the pipeline finishes, whether or not an issue was filed. If the pipeline throws, no issue and no run record: only a log line. Worth a failure record later.
7. The flag names in the current demo are `paymentFailure` (variants off, 10% ... 100%), `adHighCpu`, `kafkaQueueProblems`. The brief's old names did not exist.
8. Strands TypeScript SDK 1.17.0 installed cleanly, needs zod 4. It is a 1.x release, no longer labelled preview on npm.

### Verify on the box, in this order

    cd /root/code && git clone <night-call repo> night-call && cd night-call && cp .env.example .env
    # fill NIGHT_CALL_MODEL_ID, NIGHT_CALL_GITHUB_REPOSITORY, GITHUB_TOKEN in .env
    npm install && npm run smoke:bedrock          # one Bedrock round trip; if this fails, stop
    npm run overlay -- /root/code/astronomy-shop
    cp -r ../NightCall/astronomy-shop-overlay/* /root/code/astronomy-shop/   # or from the fork
    cd /root/code/astronomy-shop && docker compose -p prod -f compose.yaml -f compose.full.yaml -f compose.observability.yaml -f compose.nightcall.yaml config > /dev/null && echo compose-ok
    docker compose -p clone -f compose.yaml -f compose.full.yaml -f compose.observability.yaml -f compose.clone.yaml config > /dev/null && echo clone-ok
    make -C /root/code/night-call prod-up
    docker exec night-call node -e "console.log('alive')"
    curl -s localhost:9090/api/v1/rules | head -c 400          # rules loaded
    curl -s localhost:9093/api/v2/status | head -c 200         # alertmanager up
    # wait for a green snapshot: docker exec night-call cat /state/snapshots/last-green.json
    make -C /root/code/night-call break-payment
    # watch: docker logs -f night-call ; expect an issue within ~7 minutes

Things most likely to be wrong on first contact, so look there first: the Jaeger query URL shape on Jaeger v2, the exact Prometheus metric names (`traces_span_metrics_calls_total`, `container_cpu_utilization`, `kafka_consumer_group_lag`), and whether `ports: !override []` is accepted by the box's compose version.

### Second pass, same night

A review of the whole tree found nine real defects before first contact. All fixed:

1. The vocabulary gate was cancelling Strands' own `strands_structured_output` tool, so triage could never return a hypothesis. Gate now allows it.
2. `.env.example` set `NIGHT_CALL_HOST=127.0.0.1`, which `env_file` would have carried into the container and Alertmanager would have got connection refused. Compose now sets `0.0.0.0` explicitly.
3. Prometheus' OTLP receiver appends `_ratio` to unit-1 gauges, so the CPU and Kafka series are probably `container_cpu_utilization_ratio` and `kafka_consumer_group_lag_ratio`. Probes and rules now accept both spellings with `or`. Confirm on the box: `curl -s localhost:9090/api/v1/label/__name__/values | grep -E 'container_cpu|kafka_consumer'`.
4. `flagd-ui` in the clone would have mounted the production flag directory read-write. The clone overlay now redirects it too.
5. Reproduction now requires a green clone baseline, and the sandbox run bails if the clone never goes green. The container probe no longer fails forever on a single historical restart; it fails on not running, or a restart in the last three minutes.
6. The snapshot watcher reads flags before probing and again after, and only records a snapshot if they match, so a flag flip during the probe cannot be recorded as green.
7. Payment error rate uses a 2m window (the span metrics flush every 60s, a 1m window was mostly empty). Trials now watch up to six looks 30s apart and call it cleared after two consecutive green looks, so a working revert reads as cleared once the window rolls.
8. Incidents left in `running` by a restart are reopened on boot.
9. `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` added to `.env.example`; they reach the container through `env_file`.

Known and left alone: with `repeat_interval: 1h` and incidents closing at the end of a run, an unfixed fault re-files an issue every hour. Fine for the demo, and a real deployment would resolve the alert.

### Fri Sep 11, early: reconciled with the box session's Phase 0 report

Facts from the box (NOTES-box.md there, 381 lines): 28 containers under project `prod`, image pull 1m28s, cold start to HTTP 200 in 44s. `paymentFailure=100%` gives 422 PAYMENT_FAILED on every checkout and 66 error spans in Jaeger; revert restores 200 immediately. `adHighCpu=on` takes the ad container from under 1% to 408% CPU within 20s and back within 20s of revert. It reproduces cold, but it is request-gated: the flag is read inside the getAds handler, so the clone's load generator is what triggers it. flagd picks up file writes in under a second.

Changes made in response:
- Jaeger's query API sits under its `base_path`, so the traces URL is now `/jaeger/ui/api/traces` on the container's 16686.
- `compose.box-override.yaml` (the box's local file raising `ad` and `fraud-detection` to 768M, both OOM loop at the shipped 300M) is included in every clone compose call when present, and in the Makefile's prod command. Without it the clone would never go green.
- `container_cpu_utilization_ratio` is real but climbs monotonically, so the ad CPU probe now reads docker stats directly, the same signal the box trusted, with a ceiling of 150 percent. The Prometheus alert rule uses `jvm_cpu_recent_utilization_ratio{service_name="ad"} > 0.25`.
- The 60s waits in the Phase 0 prompt were mine and were unnecessary; the pipeline's waits are about metric windows, not flagd.

Still open on the box, Saif's call: every published port binds 0.0.0.0, including Postgres, Valkey, OpenSearch and Prometheus, and Docker's iptables rules bypass ufw. `install-tools.sh` writes `{ "ip": "127.0.0.1" }` to `/etc/docker/daemon.json`, so either that did not run on this box or Docker was not restarted after. Fix is that file plus `systemctl restart docker`, then `ss -tlnp | grep 0.0.0.0` should show only sshd.

Cross-session messaging between the box's Claude and this one does not exist. The loop that works: Saif pastes the box's report here, this session hands back the next prompt.

### Ports, corrected by the box

My suggested fix (rewrite daemon.json, restart docker) was wrong and the box session declined it with evidence. The daemon setting was already in place and only governs the default bridge; the demo runs on a user-defined bridge, `opentelemetry-demo`, which needs `com.docker.network.bridge.host_binding_ipv4: 127.0.0.1` as a driver option on that network. The box put it in `compose.box-override.yaml` and recreated the stack. All 29 docker-proxy processes now bind 127.0.0.1; sshd is the only wildcard listener.

Consequences here: Night Call's own published ports in `compose.nightcall.yaml` are now written as `127.0.0.1:8000`, `127.0.0.1:8001` and `127.0.0.1:9093` explicitly, so they stay on loopback even without the override. The clone network is `internal`, so it publishes nothing regardless. Ephemeral ports shifted on recreate, which does not matter to Night Call because it addresses containers by IP inside the network. Also: 2.28.40.184 is the box's real address after all.

### Overnight check 1 (04:25 PKT)

No word from the box beyond what Saif relayed, and the repository is still not a source for this session, so nothing pushed from here. Added `pipeline.service.spec.ts`: the orchestration is now covered with fake dependencies (skip without a snapshot; diff, sandbox, issue and run record on the happy path). 23 tests.

One thing that surfaced while writing it: `@strands-agents/sdk` is ESM only. The Nest build is CommonJS, which works on Node 22.12+ through `require(esm)`, but it is the first thing to suspect if `npm run smoke:bedrock` or the container fails on import. The fix, if needed, is `module: nodenext` in tsconfig.build.json and `"type": "module"` in package.json.

### Sun Sep 13: build plan for the new product

The product changed with the design brief: three roles, a live incident page, three proof rounds and an automatic mitigation PR, on the recommendation cache incident. PLAN.md is replaced. Each build step now has a plan in `docs/phases/`, a review and Saif's approval before anything is built.

Cache proof timings, read from `result.json` of run `20260912-cache-feasibility-01`: the sandbox stack started once; each round took about 4.0 minutes (baseline 1.34, fault 0.39 to 0.47, mitigated 1.34, plus restart and idle); three rounds took 13.9 minutes from 18:25:52 to 18:39:46 UTC including stack start and teardown. Inside the 30 minute investigation budget, verification has to start by minute 13 to leave room for the PR.

In the fault stage, memory sampled on every request peaked at 47 percent of the 500 MiB limit, then Docker killed the service 23 to 28 seconds in. A memory threshold would never fire. The alarm is three fixed rules instead:
- crash: `resets(container_uptime_seconds{container_name="recommendation"}[2m]) > 0`. The memory and uptime series carry only `container_name` and `host_name`, and sandbox copies report into the same Prometheus under their own container names, so the match must be exact.
- failing requests: span metrics `status_code="STATUS_CODE_ERROR"` on `oteldemo.RecommendationService/ListRecommendations` and the frontend `GET /api/recommendations` span. Today only UNSET series exist; ERROR appears on the first failure.
- canary: the collector's existing httpcheck only probes `http://frontend-proxy:8080`. A second target on `/api/recommendations` goes in through the overlay.
Prometheus scrapes every 60 s, so expect up to a minute from failure to alarm.

Evidence additions: CPU is recorded next to memory, and an always-on recorder keeps 10 s samples for 30 minutes so agents see the climb before the crash.

Models: provider-agnostic, each role set as `provider:modelId`. Lead and investigator on Featherless `zai-org/GLM-5.3`; verifier on Bedrock `global.anthropic.claude-fable-5-1`. The Strands OpenAI provider needs the `openai` package (peer ^6.45.0); 6.49.0 installed. Fallbacks: Kimi K3 on Featherless, OpenRouter, GPT-6 Astra or Opus 5 on Bedrock.

Demo branch: `nightcall-demo` on `Naaman-Saif/opentelemetry-demo` at `2d1bc92`, the shop version on the box. The fork's main is two dependency bumps ahead.

Model smoke test on the box (`npm run smoke:models`, one tool that returns 42, pass only if the tool was called and the structured answer is 42): GLM-5.3 on Featherless passed for lead and investigator. Bedrock refused every model on the AWS account with "Error 002: Access to Bedrock models is not allowed for this account": Fable 5.1, GPT-6 Astra, Opus 5, Haiku 4.5 and gpt-oss-120b all failed, and `get-foundation-model-availability` reports `authorizationStatus: NOT_AUTHORIZED` with agreement `NOT_AVAILABLE`. Not fixable by settings; it needs model access enabled on the account. Saif chose Kimi K3 on Featherless as verifier, which passed (one tool call, answer 42). AgentCore still hosts the agents; their model calls go to Featherless.

### Sun Sep 13: TypeScript sandbox copy

The Python cache runner is ported to `src/sandbox-copy/` and ran one round from a one-off container of the NightCall image on the box (run `20260913-ts-round-01`, runner joined `nc-sandbox-network` and left it before teardown). Baseline 400 of 400 healthy, no empty responses, peak 55 MB. Fault: out-of-memory event for `nc-sandbox-recommendation` and a 500 on request 126, peak sampled 249 MB of 500 MiB, CPU up to 106 percent. Mitigated 400 of 400 healthy, peak 50 MB (10 percent of the limit). CPU was a number on every sample. Production identity equal before and after; no sandbox containers or network left. Minutes: stack start 0.34, baseline 1.37 (workload 1.34), fault stage 1.12 (workload 0.48, the rest is restart and the 20 s cold idle), mitigated 1.64 (workload 1.34, plus restart), evidence 0.01, teardown 0.32, total 4.8. Python: baseline 1.34, fault 0.39 to 0.47, mitigated 1.34. Copied asset folders must keep their source modes: flagd runs as uid 65532 and cannot read a 700 folder.

### Sun Sep 13: agents package, tool API, AgentCore blocked

The agent package (`agent/`), tool API (`GET /tool/ping`, `POST /tool/incidents/:id/events` behind a bearer token on port 8002), runtime invoker and deploy script are built and merged. AgentCore refused to create a runtime: `ServiceQuotaExceededException: maxAgents limit exceeded`. The account's "Total Agents per Account" quota (L-F4575653) is 0 in eu-central-1 and us-east-1, against an AWS default of 1000. A second account-level block after Bedrock model access. An increase request for 1001 is pending (values at or below the default are rejected by Service Quotas). The ECR repository, the arm64 image and the execution role already exist; the deploy script has not run past the create call.

The approved fallback is live: the same agent image runs on the box as container `nightcall-agents` on the shop network, the invoker points at `http://nightcall-agents:8080`, and the agents reach the tool API through a Cloudflare quick tunnel, as they would from AWS. Hello run through the tunnel: invoke accepted in 58 ms, tool ping authorized, GLM-5.3 reply, event stored with sequence 1. Long run: final event after 16 minutes, ping `HealthyBusy` during the run. Without a token the tool API answers 401; `/alerts` is 404 on 8002; the public `/state` route is gone from 8001. The NightCall container is up again after 43 hours (blank required settings trimmed) with the old pipeline module unregistered. A quick tunnel restart changes its URL, so the agents container has to be recreated with the new `TOOL_API_URL`.
