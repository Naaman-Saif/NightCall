# Cache proof study

This is a reusable feasibility experiment, not the NightCall agent implementation.
It runs on the existing Docker host using Python's standard library and existing images.

## Contract

| Question | Observable evidence | Criterion |
| --- | --- | --- |
| Does normal traffic work? | HTTP responses, memory, Docker events | 400 recommendation requests at up to 5/s, all 200, no recommendation OOM/restart |
| Is one cold request enough? | Response and memory after 20 seconds idle | Report observation without inferring that longer idle periods are safe |
| Does traffic reproduce the fault? | Request errors, memory growth, Docker OOM events | Bounded workload produces a recommendation OOM and a failed HTTP request |
| Does mitigation recover and prevent recurrence? | Same workload after flag off and explicit recommendation restart | All requests succeed, no recommendation OOM/restart, memory remains below 80% of the unchanged limit |
| Is it repeatable? | Three independently recreated stacks and complete stage artifacts | All three complete baseline, reproduction, and mitigation checks |
| Was the running application preserved? | Configuration hash and recommendation image/source identity before/after | Equal configuration hash and source/image identity |

The starting workload is a bounded synthetic shopper calling the existing frontend
recommendations API. It is recorded for replay but is not a captured customer incident.
The fault flag is applied only in the disposable stack. Application source code,
randomness, and the recommendation memory limit are not modified.

The experiment uses a new internal Docker network, no published ports, copied
configuration assets, private database storage, and a collector without host filesystem
or Docker socket mounts. Background shopping is disabled to control request history.
Telemetry infrastructure differs from production and that limitation is recorded.

The mitigation recipe tested is reverting `recommendationCacheFailure` to the observed
healthy `off` setting and explicitly restarting the sandbox recommendation container.
It does not assert that a flag revert alone releases memory or that a restart alone
prevents recurrence. It is an experiment candidate until the checks pass.

## Run

Copy this directory to a dedicated directory on the box. Then run:

```sh
python3 run.py /root/code/nightcall-cache-proof/runs/<unique-run-id>
```

The runner refuses an existing proof stack or nonempty output directory, records its
inputs and image identities, and removes only its own `nc-cache-proof` resources.
It has a 30-minute total budget and per-command/network timeouts. Cleanup is attempted
even on failure; cleanup failure is recorded and must be resolved before another run.

Output includes `result.json`, isolation and preservation checks, per-request JSONL,
memory samples, Docker events, service logs, and retained Jaeger traces. An incomplete
stage is not a pass. No PR, credentials, application deployment, or source edit is part
of this study.
