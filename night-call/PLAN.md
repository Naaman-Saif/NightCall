# Night Call, build plan

Read BRIEF.md first. Every phase has a "done when". Do not start the next phase until the current one's "done when" is true on the Hetzner box, not just on the Mac. Ask Saif before any decision not covered here.

Smallest submittable thing: Phase 0 to 5 with one fault. If Sunday morning arrives and Phase 5 is not done, stop adding and go to Phase 8.

## Phase 0, tonight (Thu Sep 10): the stack exists and breaks on command
- [ ] Fork opentelemetry-demo as `astronomy-shop`. Create `night-call` repo with Apache 2.0 LICENSE and a README stub.
- [ ] On the 32 GB box: `uname -m`, Docker and Compose v2 present, ports open only on localhost plus ssh.
- [ ] `docker compose --no-build pull` for the demo. Record pull time in NOTES.md.
- [ ] Bring prod up under project name `prod`. Confirm frontend, Prometheus, Jaeger, flagd UI reachable from the box over curl.
- [ ] Toggle `paymentServiceFailure` on by editing the flagd JSON. Confirm errors appear in Jaeger and in the frontend. Toggle back off. Confirm recovery.
- [ ] Bring a second copy up under project name `clone` with its own ports. Time it cold. Record in NOTES.md. Tear it down.
- [ ] Bedrock: enable model access in eu-central-1, run `aws bedrock list-foundation-models`, pick the latest Claude Sonnet id, write it into `night_call/config.py`. Run a five-line Strands agent from the box that returns one sentence. Fall back to us-east-1 if needed.
- [ ] Makefile on the Mac: `make deploy` does `git push` then ssh `git pull` plus restart. `make logs` tails the service.
Done when: both stacks have come up on the box, the flag fault has been seen and recovered by hand, and a Strands agent has completed one Bedrock round trip from the box.

## Phase 1, Fri morning: alerting and ingress
- [ ] Add Alertmanager to a compose overlay in `astronomy-shop`. One Prometheus alert rule per fault: payment error rate, adservice CPU, kafka consumer lag. Route everything to `http://night-call:8000/alerts`.
- [ ] `night_call/ingress/alerts.py`: FastAPI `POST /alerts`, accepts Alertmanager payload, writes an incident record to `incidents.json`, returns 202. Never calls the model inline.
- [ ] `night_call/ingress/dedupe.py`: incident key is service plus alertname. Drop alerts while an incident for that key is open.
- [ ] `night_call/runtime/worker.py`: background loop picks open incidents and runs the pipeline.
Done when: toggling `paymentServiceFailure` on results in exactly one incident record within 60 seconds, and toggling it three more times adds zero records.

## Phase 2, Fri afternoon: evidence and probes, all deterministic
- [ ] `night_call/evidence/logs.py`: last N lines per service via docker SDK.
- [ ] `night_call/evidence/traces.py`: error spans for a service from Jaeger's HTTP API, last 5 minutes.
- [ ] `night_call/evidence/config_diff.py`: diff between the flagd JSON captured at last healthy time and now. The watcher snapshots flagd JSON every 30 seconds while all probes are green; that snapshot is the known-good.
- [ ] `night_call/probes/http.py`: frontend routes and a checkout call through the frontend proxy.
- [ ] `night_call/probes/metrics.py`: per-service error rate and CPU from Prometheus HTTP API.
- [ ] `night_call/probes/containers.py`: restart counts.
- [ ] `night_call/probes/signature.py`: runs all probes for a project name, returns a failure signature, the set of failing probe names with values.
Done when: `python -m night_call.probes.signature prod` prints an empty signature on a healthy stack and a non-empty one within 60 seconds of a flag flip.

## Phase 3, Fri evening: clone and replay
- [ ] `night_call/sandbox/clone.py`: bring up project `clone` from the same compose files with the clone port map and no external network. Tear down.
- [ ] `night_call/sandbox/replay.py`: apply the recorded config diff to the clone's flagd. Nothing else. No LLM involvement.
- [ ] `night_call/sandbox/verify.py`: capture green baseline on the fresh clone, replay, capture signature, compare with prod's signature. Return reproduced or not reproduced.
- [ ] `night_call/sandbox/actions.py`: the four vocabulary actions implemented against a project name. `revert_flag` reads the known-good snapshot.
- [ ] `night_call/sandbox/trial.py`: apply one action in the clone, probe twice 15 seconds apart, return before, after, and a verdict: cleared, unchanged, regressed.
Done when: from a broken prod, a script clones, replays, reports reproduced, applies `revert_flag`, reports cleared, and tears down, in one run with no manual steps.

## Phase 4, Sat morning: the three Strands agents
- [ ] `night_call/agents/triage.py`: tools are the three evidence readers. Structured output: suspected service, suspected cause, confidence, evidence pointers.
- [ ] `night_call/agents/remediator.py`: input is the hypothesis plus the action vocabulary. Structured output: ordered list of candidates, each one action with a one-line rationale. Any `set_flag` with a novel value is tagged needs_human and never trialled.
- [ ] `night_call/agents/reporter.py`: input is the full evidence bundle. Output is the issue title and body in the template below.
- [ ] `night_call/gate/vocabulary.py`: rejects any candidate outside the four actions before it reaches the sandbox. Hooked with Strands `BeforeToolCall` so it is enforced by the framework, not by convention.
- [ ] Multi-agent wiring as a Strands graph of three nodes with the deterministic pipeline between them. Agents never call each other.
Done when: a fake evidence bundle produces a sensible hypothesis, a candidate list, and a filled issue body, with no network mutation.

## Phase 5, Sat afternoon: end to end and the issue
- [ ] `night_call/report/github.py`: create issue on `astronomy-shop` via REST. Token from env. Label `night-call`.
- [ ] `night_call/runtime/pipeline.py`: alert, triage, clone, replay, verify, trials, report, teardown. Not reproduced means the issue is filed with the hypothesis only and a clear "could not reproduce in clone" section.
- [ ] Run the payment fault end to end three times. Fix whatever breaks. Record run time in NOTES.md.
- [ ] Run the adservice fault end to end. Confirm one candidate fails and the issue shows it.
Done when: flipping a flag on prod produces a GitHub issue with reproduction evidence and trial results within 5 minutes, hands off, three runs in a row.

Issue template:
```
Title: [Night Call] <service>: <one-line cause>
## Alert
<alertname, fired at, service>
## Hypothesis
<cause, confidence, evidence pointers>
## Reproduction in sandbox
Green baseline: <probe summary>
After replaying config diff: <failure signature>
Matches production signature: yes / no
## Fix candidates
1. <action> : <verdict> : before <signature> : after <signature>
2. ...
## Needs a human
<any novel-value candidates, or "none">
## Diff replayed
<the config diff>
```

## Phase 6, Sat evening: hardening for the recording
- [ ] Watcher cron on the box: flip a fault every 4 hours, so issues accumulate before judging.
- [ ] Rehearse the two-fault demo end to end three times. Note any flake.
- [ ] Remove any code path that could write to prod. Grep for the project name `prod` in every mutating call. Only `clone` may appear there.
Done when: three clean rehearsals and the prod-write grep is empty.

## Phase 7, Sunday morning, only if Phase 5 was done Saturday
- [ ] `kafkaQueueProblems` as tier two: alert fires, triage runs, clone replay does not reproduce, issue says so.
- [ ] Mascot: one flat illustration of Pehredaar, the night watchman with a lantern. 30 minutes cap. Title card and README only.
- [ ] Optional: checkpoint and restore one stateless container on camera as a roadmap teaser. Skip if anything else is unfinished.

## Phase 8, Sunday: ship
- [ ] Architecture diagram: alert, three agents, deterministic pipeline, clone, GitHub. One box marked "later: environment forking".
- [ ] README: what it does, what it will not do, the autonomy rule, the trigger-is-in-the-diff scope, one paragraph titled "why forking, not cloning".
- [ ] Video under 5 minutes: 0:00 problem, 0:40 what it is, 1:00 payment fault end to end sped up with timestamps, 2:30 adservice fault with the failed candidate, 4:00 open the issue and read it, 4:30 diagram and close. Split screen, captions on.
- [ ] builder.aws.com post with "Agents for Humans" in the title. Build story, Strands usage, Bedrock.
- [ ] Devpost submission: description, repo link, video link, diagram, track Professional. Submit by Sunday 23:00 PKT.
Done when: the submission page shows submitted.

## Rules for Cowork
- Read BRIEF.md coding rules before writing any file.
- Every "done when" is verified on the Hetzner box.
- Any deviation from the action vocabulary, any prod mutation, any new dependency, any scope addition: stop and ask Saif.
- Keep NOTES.md as the running log of timings and decisions. It is the source for the builder post.
