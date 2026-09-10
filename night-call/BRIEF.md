# Night Call, project brief

## One line
Every AI SRE tool wakes you up with a theory. Night Call wakes you up with the evidence: the failure reproduced in a sandboxed copy of the whole stack, and the fix proven against it, filed as a GitHub issue before you are awake.

## Design
Product definition, the outcome paths and the ICP live on a Claude Design canvas. Positioning copy in the video, the README and the Devpost description comes from there, not from this file.

## Hackathon facts
- Agents for Humans Hackathon (AWS, Devpost). Track: Professional Agents.
- Deadline: Sep 14 2026, 5:00pm PDT. That is Sep 15, 05:00 PKT. Internal deadline: Sunday Sep 13, 23:00 PKT.
- Must use Strands Agents SDK. Deliverables: public repo with OSI license, architecture diagram, demo video under 5 minutes, text description on Devpost, one builder.aws.com post with "Agents for Humans" in the title (bonus points).
- Judging: Potential Impact, Creativity, Technical Implementation (Strands usage, working non-trivial code), Design (complete product, not a proof of concept), Presentation.

## What it does
1. Prometheus Alertmanager posts an alert to Night Call.
2. Triage agent reads logs, traces and the config diff, returns a hypothesis.
3. Deterministic code brings up a full clone of the stack, replays the diff, and confirms the clone shows the same failure signature as prod. If it does not, the issue says "could not reproduce" and stops.
4. Remediator agent proposes fix candidates from a fixed action vocabulary.
5. Deterministic code applies each candidate in the clone and probes before and after.
6. Reporter agent files a GitHub issue with the evidence: reproduction diff, each candidate with its result.
7. Clone destroyed.

## What it deliberately does not do
- It never mutates production. Production is read-only by construction. The sandbox has no network egress.
- It does not open PRs and does not apply fixes. Implementation is the five-minute part once the fix is proven.
- The model never invents a reproduction. Replay is code replaying a recorded diff. Zero degrees of freedom.

## Why this is different
Commercial tools (Resolve, Cleric, Traversal, Datadog Bits, incident.io) and open source tools (HolmesGPT, K8sGPT, Aurora) all stop at diagnosis plus a proposal or PR. None run the fix before handing it over. Reading logs tells you why it broke. Only running the fix tells you the fix works.

Strands ships an LLM risk classifier for its HumanInTheLoop handler and a sandboxed shell tool. Night Call does not claim those as novel. The novelty is verification of a structured action against a clone.

## Scope: "the trigger is in the diff"
Faults where the cause is visible in a config or flag diff and reproduces in a cold clone. Bad config push, crash loop from a bad env var, flag flip, a wrong image tag pinned in compose. Disk fill is out: it is not visible in a config diff and none of the actions address it. Load-dependent and state-dependent faults are tier two: diagnosed, not reproduced, and the issue says so honestly.

## Target application
OpenTelemetry Demo (Astronomy Shop), pre-built ghcr images, no source build. It ships Prometheus, Grafana, Jaeger, and flagd fault flags. Alertmanager is added by us.

Faults used:
- `paymentFailure` set to `100%`: happy path. Framed as a bad config push by a release bot. Fix: revert flag to known-good (`off`). Checkout answers 422 while it is on.
- `adHighCpu` set to `on`: second fault. Fix candidates: revert flag, restart service. Show one candidate failing. Whether it reproduces in a cold clone is unverified until the box says so.
- `kafkaQueueProblems`: tier two. Load-shaped, does not reproduce cold. Issue says so. Optional, Sunday only.

## Action vocabulary (the only things the agent can propose)
- `revert_flag(flag)`: sets the flag to its last value observed while healthy.
- `restart_service(service)`: restarts one container.
- `set_flag(flag, value)`: any novel value. Written into the issue as needing a human and never applied, not even in the clone.

Two of these are ever trialled. `scale_replicas` was dropped on Sep 10: the demo pins every container_name, and Docker refuses to scale a service with a fixed container name, so the action could never run against this stack. No shell tool. No free-form commands. Ever.

## Autonomy rule
The agent may only move config to a value previously observed while the service was healthy. Novel values are never applied, even in the clone, without a human. Reverts to known-good are tried automatically.

## Infrastructure
- Hetzner 32 GB box: runs prod stack, clone stack, and the Night Call service. Verify arch with `uname -m`; if aarch64, confirm ghcr images are multi-arch before pulling.
- Helsinki 6 GB and Falkenstein 12 GB boxes: not used.
- Cowork works on the Mac. Deploy by `git pull` on the box via a Makefile target that runs over ssh.
- Docker socket is never exposed over TCP. Night Call gets it because it runs on the box.

## Repos
- `night-call`: the agent and pipeline. Apache 2.0.
- `astronomy-shop`: fork of opentelemetry-demo carrying our compose overlays and Alertmanager config. Issues are filed here so the artifact lands on the application's repo, like it would in real life.

## Model
Bedrock, Claude Sonnet, latest available in the chosen region, via a cross-region inference profile. Region: try eu-central-1 first for latency to Hetzner; fall back to us-east-1 if the model is unavailable there. Pin the exact model id in one config module after checking `aws bedrock list-foundation-models`. Do not hard-code an id from memory.

## Stack
TypeScript on Node 22, NestJS, `@strands-agents/sdk`, dockerode, undici, zod. Issues via the GitHub REST API over undici, no extra client library.

The Strands TypeScript SDK is in preview. It carries the Graph multi-agent pattern and the `BeforeToolCallEvent` hook, which are the two SDK features this design needs. Conditional graph edges with runtime context are Python only and are not used, because routing between agents is deterministic code rather than a graph condition. If the smoke test does not complete one Bedrock round trip on the box, fall back to Python before writing anything else.

Module boundaries live in ARCHITECTURE.md.

## Coding rules for everything written in this project
- Zero comments in code. No exceptions.
- Names a non-engineer could read. Predicates in positive form, named for what they inspect.
- Max 2 indent levels inside a function, 20 lines per function, 2 params per function, 5 fields plus methods per class, 100 lines per file.
- Caps apply to code being written. Existing third-party files are left alone.
- Ask before building any throwaway harness.
- No em dashes anywhere, including docs and the issue template.

## Cut list, hold to it
No AgentCore. No MCP. No dashboard, the GitHub issue is the UI. No auth. No prod apply path. No rollback. No human interrupt in code. No database beyond a JSON file. No Kubernetes. No pretty UI. Mascot gets 30 minutes on Sunday and no more.
