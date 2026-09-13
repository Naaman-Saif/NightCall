# Night Call, project brief

## One line
Every AI SRE tool wakes you up with a theory. Night Call wakes you up with evidence: the failure reproduced in a sealed copy of the application, a mitigation proven across three clean rounds, and a pull request waiting for your review.

## Where the detail lives
- Product and interface: `docs/design/NIGHTCALL-DESIGN-BRIEF.md`, with the approved visual direction from the NightCall design system.
- Build plan and order of work: `PLAN.md`. Each build step has its own plan in `docs/phases/`.
- Feasibility proof for the flagship incident: `experiments/cache-proof/`.
- Running log of timings and decisions: `NOTES.md`.

## Hackathon facts
- Agents for Humans Hackathon (AWS, Devpost). Track: Professional Agents.
- Deadline: Sep 14 2026, 5:00pm PDT. That is Sep 15, 05:00 PKT. Product freeze: Monday Sep 14, 14:00 PKT.
- Must use Strands Agents SDK. Deliverables: public repo with OSI license, architecture diagram, demo video under 5 minutes, text description on Devpost, AWS Builder ID, one builder.aws.com post with "Agents for Humans" in the title (bonus points). A live demo link strengthens the technical score.
- Judging, equally weighted: Technical Implementation (Strands usage, AgentCore deployment helps), Design, Potential Impact, Creativity, Presentation.

## Who it is for
A developer carrying on-call for many services at a very small company, often a one-person engineering team. They want senior engineering discipline from their tooling: find the evidence, reproduce the actual failure, prove a remedy, and never manufacture a reproduction.

## What it does
1. Prometheus fires on a fixed rule (the service crashed and restarted, its requests are failing, or a scheduled canary request fails). Alertmanager posts the alert to Night Call.
2. An incident opens and a live incident page starts telling the story.
3. Three roles share one investigation, running in one Amazon Bedrock AgentCore runtime:
   - Investigation lead: reads logs, traces, memory, CPU and the deploy history of the flag file; writes the incident brief; forms up to three evidence-backed hypotheses; asks the developer a focused question when the answer changes the next step.
   - Experiment investigator: records what counts as the same failure before any run, then chooses bounded experiments in a sealed copy of the application.
   - Independent verifier: reviews every claimed reproduction and the three proof rounds. It can reject; it can never pass a check the code marked failed.
4. Deterministic code owns everything that must not depend on a model: starting and sealing the sandbox, the pass rules, three clean rounds, the 30 minute budget, cleanup, and checking that production was untouched.
5. After three of three rounds pass, Night Call opens a pull request with the exact mitigation against a dedicated demo branch of the application fork. A human decides whether to merge and deploy.
6. If there is no sufficient proof within 30 minutes, the incident page reports what is known and unresolved, and no pull request is opened.

## What it deliberately does not do
- It never changes production. Production is read-only by construction. The sandbox has no network egress, no published ports and no Docker socket.
- It never deploys. The pull request is the handoff; merging is a human decision.
- The model never invents a reproduction. Pass and fail are computed by code against checks recorded before the experiment ran.
- It does not call a mitigation a repair of the underlying defect.

## Flagship incident
Recommendation cache growth in the OpenTelemetry Demo (Astronomy Shop). A bad default for the `recommendationCacheFailure` flag is committed to the demo branch and deployed. Under shopper traffic the recommendation service grows memory until Docker kills it and requests fail. Proven on the box on Sep 12: out of memory after about 100 requests with the flag on, 400 of 400 healthy requests after flag off plus restart, production unchanged, three of three rounds.

## Agent tools
Agents never run shell commands. Every action is a bounded tool call to Night Call's tool API on the box, validated by schema and guarded by code: read-only evidence readers for production, a symptom checklist recorded before any experiment, experiments with limited flag values, restart choice, request count and pacing, and a mitigation limited to existing flag variants.

## Autonomy rule
Experiments and mitigations run only in the sandbox. A mitigation may only move a flag to a variant that already exists in the flag file. Anything else goes to a human.

## Infrastructure
- Hetzner box: runs the production shop, the sandbox copies and the Night Call service. x86_64.
- AgentCore runtime in eu-central-1 hosts the three agent roles and calls Night Call's tool API over HTTPS with a bearer token.
- Docker socket is never exposed over TCP. Night Call gets it because it runs on the box.
- Public hosting of the incident page is handled outside this repo; operator actions sit under a separate path behind that login.

## Repos
- `NightCall`: the service, agents, web app and overlays. Apache 2.0.
- `Naaman-Saif/opentelemetry-demo`: fork of the demo with branch `nightcall-demo`. Mitigation pull requests target that branch.

## Models
Provider-agnostic. Each role reads its model from settings as `provider:modelId`; switching provider or model is a settings change, not a code change.
- Investigation lead and experiment investigator: GLM-5.3 (open weights) through Featherless, via the Strands OpenAI-compatible provider.
- Independent verifier: Kimi K3 (open weights) through Featherless, a different model family from the one it checks.
- Fallbacks: OpenRouter for the same open models; Claude Fable 5.1 through Amazon Bedrock once the AWS account has model access.

## Stack
TypeScript on Node 22. NestJS service with dockerode, undici and zod. Agents in a separate ESM package using `@strands-agents/sdk` and the AgentCore TypeScript SDK. Web app in Vite and React, built from the NightCall design system. GitHub REST over undici.

Module boundaries live in ARCHITECTURE.md.

## Coding rules for everything written in this project
- Zero comments in code. No exceptions.
- Names a non-engineer could read. Predicates in positive form, named for what they inspect.
- Max 2 indent levels inside a function, 20 lines per function, 2 params per function, 5 fields plus methods per class, 100 lines per file.
- Caps apply to code being written. Existing third-party files are left alone.
- Ask before building any throwaway harness.
- No em dashes anywhere, including docs and the issue template.

## Cut list, hold to it
No Kubernetes. No database beyond JSON files. No production apply path. No shell tool for agents. No general monitoring dashboard. No self-service onboarding, billing or integration marketplace. No arbitrary code repair. Mascot gets 30 minutes and no more.
