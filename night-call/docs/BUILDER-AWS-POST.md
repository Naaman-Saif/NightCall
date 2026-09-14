# Building NightCall: an on-call agent that proves the fix before it opens the pull request

Draft for builder.aws.com. Numbers come from the real run INC-015 on 2026-09-14.

## The problem: 3am, and a chat window is not enough

If you are the only engineer at a small company, you are on call for everything. When a service crashes at 3am, the hard part is not typing a fix. It is working out what is happening, which change caused it, and whether the fix holds.

An agent that only chats names a cause with confidence, and you spend the night checking its claims. We wanted one that cites, reproduces the failure somewhere safe, proves the fix, and hands you a small change to review.

## What NightCall does, told through one real run

Our test system is the OpenTelemetry Demo's Astronomy Shop. A release turned on the `recommendationCacheFailure` flag, and the recommendation service started running out of memory under traffic.

At 05:22:00 UTC we pressed "Start investigation". NightCall read 9 signals, each fetched by the server and linked to its source: frontend failure rate 1.65 percent while backend spans showed 0.00 percent, 4 out-of-memory restarts in 10 minutes, memory peaking at 355 MiB of a 500 MiB limit, 1032 requests captured from traces, deploy history showing commit `afa6f51` "release: enable recommendation cache", the flag state (on), CPU and logs.

It asked one question: is this customer impact tolerable while it tests a fix? Nobody answered, so it treated the incident as urgent and said so.

The most likely cause was the flag. NightCall reproduced the crash in a sealed copy of the shop at 1x speed in about 2 minutes: 101 requests, 1 out-of-memory kill, 1 failed request. It proposed turning the flag off and restarting, then verified that 3 times out of 3 at 2x speed. Each round's fix stage served 200 healthy requests with 0 failures, with memory peaking at 9 to 10 percent of the limit.

At 05:38:45 it opened pull request #3 on our fork of the shop: one line, `defaultVariant` from `on` to `off`. The run stopped at 05:38:52, 16 minutes 52 seconds after the button press.

## How AgentCore hosts the agents

The agents are written with the Strands Agents SDK for TypeScript and packaged as one container image, hosted on Amazon Bedrock AgentCore Runtime in `us-west-1`.

The NightCall service, running next to the shop on our box, starts a run by calling `InvokeAgentRuntime` with the incident id. The agent registers an async task and returns at once, so the service is never blocked during a 15-minute investigation, and AgentCore keeps the session alive while the task is busy.

The agents never touch the shop. Every read and write goes to a tool API on the box, reached over HTTPS through a Cloudflare tunnel, with a separate bearer token per role. The service works out the role from the token alone.

Quota decided the region. Our AgentCore agent quota was 0 in the regions we tried first, so we made the region a setting and found `us-west-1`, where creation worked. The same image also runs as a plain container on the box as a fallback: an ARN in the setting means AgentCore, an HTTP address means the container.

Bedrock model access was also blocked on the account, so the models run on Featherless through its OpenAI-compatible API: GLM-5.3 leads, Kimi-K3 reviews. Each role's model is a setting, so Bedrock models can be switched in without code changes.

## How the proof works

**A sealed copy.** Experiments run in a separate Docker Compose project, `nc-sandbox`, on an internal network with no published ports, copied config, and memory limits checked against production. A child process runs it, so a stuck experiment can be killed without taking the service down.

**Real traffic.** When the incident opens, NightCall reads the last 20 minutes of frontend traces from Jaeger and builds a traffic recipe of which recommendation requests arrived and when. Experiments replay it. Without traces it falls back to the Prometheus request rate, then a fixed load, and the report says which.

**Checks written first.** Pass and fail checks come from a fixed catalogue with bounded values, such as at least 1 out-of-memory kill in the fault stage, and 0 failures with at least 200 healthy requests after the fix. They are recorded before the experiment starts.

**3 of 3 rounds.** Verification builds a fresh copy for each of three rounds, runs the fault then the fix, and stops at the first failed round.

**A reviewer with code guards.** Kimi-K3, a different model family from the lead, reviews the reproduction and the verification run and writes the reasons. Code refuses any approval of a failed check or a missing observation, so the model can reject but never approve a failure. A rejection of a passing result counts only if it quotes an observed value. If the review does not finish within 90 seconds after a retry, the code rules decide and the report says so.

## What is enforced by code, not by the model

- Roles come from tokens; evidence, results, rounds and publication are written only by the service.
- Every number quotes a recorded reading. Missing is "not measured", zero is zero.
- "Supported" needs two independent sources and no contradiction.
- No "verified" and no pull request without 3 of 3 approved rounds; the diff is one line.
- Production identity (flag file hash, image, source checksum) is compared before and after every round.
- A 30-minute budget: at the deadline the tools close, the copy is removed and no pull request opens.

## Lessons

**A reasoning setting can remove the stream's role.** With a low `reasoning_effort`, GLM's stream sometimes arrived without the assistant role, and Strands then saw no tool calls. We now add the role before the SDK reads the stream. Kimi-K3 also once ended a stream with no finish reason after a tool result, which we now close cleanly.

**Review latency is real.** Kimi-K3 on high reasoning once returned nothing for 600 seconds. The reviewer now uses medium reasoning, a 90-second limit and one retry, then code rules take over. A slow model must not decide whether a fix is proven.

**A restart can make a report lie by omission.** The recorder keeps 30 minutes of memory, CPU and container events in memory. A restart empties it, and a crash reading taken just after one showed "0 kills" while the shop had been crashing. A zero is only true if the recorder watched the whole window. We check for an active incident before restarting, and reading a short window as "not measured" is on our list.

**Stopping and publishing can race.** The agents posted their stop event while the service was still opening the pull request, so the incident could close before the pull request was recorded. The service now records the outcome even after the incident finishes, a retry picks up an already open pull request, and the agents wait for a final publication state before stopping.

## What's next

- Let monitoring alarms start investigations automatically (built, off by default).
- A permanent private link for the tool API instead of the temporary tunnel.
- Bedrock models once account access is enabled.
- More incident types, including code-level mitigations, proved the same way.
- The impact question in Slack or Discord, on the same incident.
