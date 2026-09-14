# Devpost submission draft

Draft for the "Agents for Humans" entry. Deadline Tue 2026-09-15 05:00 PKT. Numbers are from the real run INC-015 on 2026-09-14.

## Project name

NightCall

## Tagline

Investigates the outage, proves the fix, opens the PR

(53 characters)

## What it does

NightCall is an incident investigator for the developer who is on call for everything. When a service starts failing, it:

- reads the real signals from production (failure rates, crashes, memory, CPU, logs, traces, deploy history, live flags) and writes a live incident report where every number links to the reading it came from;
- asks you one question, whether the customer impact is tolerable, and treats silence as urgent;
- proposes possible causes, and only calls one "supported" when two independent readings back it;
- rebuilds the failure in a sealed copy of the shop, replaying the real traffic it captured from traces;
- proves a fix 3 times out of 3 on fresh copies, while checking production was not touched;
- opens a one-line pull request with the evidence, for a human to merge.

In our real run INC-015, the Astronomy Shop's recommendation service was crashing out of memory after a release turned on a cache flag. NightCall read 9 signals (frontend failures 1.65 percent, 4 out-of-memory restarts in 10 minutes, memory peak 355 MiB of 500 MiB, 1032 requests captured from traces, the release commit and the flag state), named the flag as the most likely cause, reproduced the crash in about 2 minutes (101 requests, 1 out-of-memory kill), verified flag off plus restart 3 of 3 (200 healthy requests each, 0 failures, peak memory 9 to 10 percent), and opened PR #3. Total time: 16 minutes 52 seconds.

## How we built it

- **Agents:** TypeScript Strands Agents SDK, hosted on Amazon Bedrock AgentCore Runtime (us-west-1), with the same image as a container fallback on our box.
- **Models:** Featherless through its OpenAI-compatible API: GLM-5.3 for the lead, and Kimi-K3, a different model family, as the reviewer of the reproduction and the verification run. The reviewer writes its reasons, but code refuses any approval of a failed check or a missing observation, so it can reject but never approve a failure. Each role's model is a setting, so Bedrock models drop in by configuration.
- **Service:** NestJS. Every change is an event in an append-only log with zod-checked payloads; a reducer rebuilds the incident snapshot and streams it to the page.
- **Evidence:** server routes read Prometheus, Jaeger and Docker and record each reading with exact source links. The model only sees what code fetched.
- **Sandbox:** a sealed Docker Compose copy of the OpenTelemetry Demo on an internal network with no ports, run from a child process so a stuck experiment can be stopped without taking the service down.
- **Page:** Vite and React, served by Caddy, with a public read-only view and an operator view that can answer.
- **Publication:** the GitHub API on a fork of the demo, with a diff builder that refuses anything but a one-line change.

The core design choice: agents choose, code acts. Role tokens, check catalogues, verdicts, the 3 of 3 rule, identity checks and the 30-minute budget are code, not prompt instructions.

## AWS usage

- **Amazon Bedrock AgentCore Runtime** (us-west-1) hosts the Strands agents as one container, invoked asynchronously per incident.
- **Amazon ECR** stores the agent image.
- **IAM** execution role for the runtime: image pull, logs, and workload access tokens.
- **Amazon CloudWatch Logs** receives the agents' progress logs, including seconds and tokens per model call.
- **Amazon Bedrock models** were blocked on our account (Error 002), so the models run on Featherless. Switching to Bedrock is a settings change.

## Challenges we ran into

- **Bedrock models were blocked on our AWS account** (Error 002), and the AgentCore agent quota was 0 in most regions. We moved model calls to Featherless, kept the model a setting, and found a region (us-west-1) where the runtime could be created.
- **The crash does not show up as a memory alarm.** Memory peaked below half the limit before Docker killed the service, so we alarm on restarts and failed requests instead.
- **Models over-claim.** Left alone, a model will quote numbers that are not in any reading and call a guess confirmed. We moved every judgement we could into code: numbers must match readings, a cause needs a mechanism and citations, and "supported" needs two independent readers.
- **Replaying real traffic.** Jaeger keeps traces only in memory and restarts on large queries, so the recipe is read in bounded pages, with fallbacks to the Prometheus rate and then a fixed load.
- **Streaming quirks.** One model's stream sometimes omitted the assistant role, which broke tool calls in the SDK until we patched the stream before Strands read it.
- **Proving we did not touch production** meant hashing the flag file, the image and the service source before and after every round.

## Accomplishments that we're proud of

- A real end-to-end run: from a button press to a one-line PR ready for review in under 17 minutes, with a reproduction and 3 of 3 verification on fresh copies.
- An incident report where every number is a link to the query that produced it, and missing data says "not measured".
- Honest wording enforced by code: nothing says reproduced, verified or fixed without the matching proof events.
- The PR body is written from the event log, not by a model.

## What we learned

- The most useful thing an agent can do on call is gather and cite, not conclude.
- Deterministic guardrails beat prompt instructions for anything that must be true.
- One well-chosen question to the human is worth more than a chat window.
- A sandbox is only convincing if you can show it used the real traffic and did not touch production.

## What's next

- Turn on automatic alarms starting investigations, and a permanent tunnel or private link for the tool API.
- Bedrock models once account access is enabled.
- More incident types beyond one flag, including code-level mitigations tested the same way.
- Slack and Discord for the question, on the same incident.
- Onboarding for any Docker Compose application, not only the demo shop.

## Built with

TypeScript, Node.js, Strands Agents SDK, Amazon Bedrock AgentCore Runtime, Amazon ECR, Featherless, GLM-5.3, Kimi-K3, NestJS, zod, React, Vite, Caddy, Docker, Docker Compose, OpenTelemetry Demo, Prometheus, Alertmanager, Jaeger, Grafana, GitHub API, Cloudflare Tunnel, Hetzner.

## Links

- Code: this repository
- Example pull request: https://github.com/Naaman-Saif/opentelemetry-demo/pull/3

## Video script outline (3 minutes)

| Time | Show | Say |
|---|---|---|
| 0:00 to 0:15 | Pager alert, then the shop with broken recommendations | "You are the only engineer, and something is crashing at night. NightCall investigates so you can review, not dig." |
| 0:15 to 0:30 | Terminal: flag turned on; Grafana showing restarts | "A release turned on a cache flag. The recommendation service now runs out of memory under real traffic." |
| 0:30 to 0:45 | Operator page, press Start investigation | "I start an investigation. Agents run on Strands and AgentCore; every action goes through NightCall's own API." |
| 0:45 to 1:10 | Readings appear with source links; open one link into Prometheus or Jaeger | "It reads 9 signals. Every number links to the query it came from: 1.65 percent frontend failures, 4 out-of-memory restarts, 355 of 500 MiB." |
| 1:10 to 1:25 | The impact question on the page | "It asks one question: is the impact tolerable? No answer means urgent, and the report says so." |
| 1:25 to 1:45 | Possible causes, the flag marked most likely, deploy commit afa6f51 | "The model proposes causes, but code decides what counts: a cause is supported only with two independent readings." |
| 1:45 to 2:10 | Reproduction panel: live request feed, memory chart, OOM kill | "It rebuilds the crash in a sealed copy, replaying 1032 requests captured from traces. 101 requests in, one out-of-memory kill. Checks were recorded before the run, and a second model reviews the result, but code will not let it approve a failed check." |
| 2:10 to 2:35 | Verification: three rounds ticking to 3 of 3 | "Fix: flag off and restart. Three fresh copies, each with the fault then the fix. 200 healthy requests each, zero failures. Production identity checked before and after every round." |
| 2:35 to 2:50 | Open PR #3, the one-line diff and the evidence body | "Only then does it open a one-line pull request. A human decides to merge. 16 minutes 52 seconds, start to PR." |
| 2:50 to 3:00 | README limits section, closing card | "One incident type today, Bedrock models blocked on our account so models run on Featherless. Next: automatic alarms and more incident types." |
