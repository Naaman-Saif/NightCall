# Architecture

Read BRIEF.md for what the product is. This file says which module may call which.

## The one rule

The model decides. Code acts. No agent ever touches a container, a file or the network directly. Agents get read-only tools and return structured output; everything that changes state runs in `sandbox/`, called by `pipeline/`.

## Modules

| Module | Owns | May call |
| --- | --- | --- |
| `config` | Settings, the action vocabulary, `projectAcceptsWrites` | nothing |
| `incidents` | The `/alerts` endpoint, deduplication, the incident record | `config` |
| `evidence` | Container logs, error spans, config diff. Read only. | `config` |
| `probes` | HTTP, metric and container probes, and the failure signature they add up to | `config` |
| `sandbox` | Clone, replay, verify, the actions, trials | `config`, `probes` |
| `agents` | Triage, remediator, reporter, and the vocabulary gate | `config`, `evidence` |
| `report` | Filing the GitHub issue | `config` |
| `pipeline` | The order the above run in, the background worker, and the green snapshot watcher | everything |

Nothing calls upward. `agents` never calls `sandbox`, `sandbox` never calls `agents`, and no module calls `pipeline`.

## Where the safety lives

Two functions, both in `config`, and every unsafe path has to go through one of them.

`projectAcceptsWrites(project)` returns true only for the sandbox project. Every mutating call in `sandbox/` takes a project name and asks this first, so the Phase 6 audit is a search for mutating calls that skip it rather than a search for the string `prod`.

`actionRunsWithoutAHuman(name)` is the autonomy rule. It returns false for `set_flag`, which is why a novel value is written into the issue and never applied. The remediator proposes each candidate through a `propose_candidate` tool call, and `installVocabularyGate` subscribes to the Strands `BeforeToolCallEvent` to cancel any call outside the agent's allowed tool set or outside the action vocabulary, so the check is enforced by the framework rather than by everyone remembering to call it.

## Where Night Call runs

As a container inside the astronomy-shop compose project, on the same network as the shop, with the Docker socket mounted and the repository mounted at the same absolute path as on the host. That is what lets it run `docker compose -p clone` for the sandbox and reach `prometheus`, `jaeger` and `frontend-proxy` by name. After the clone comes up, Night Call joins the `night-call-clone` network (which is `internal`, no egress) and addresses clone services by container name, `clone-prometheus` and so on.

## Testing

`probes` and `config` are pure enough to test without Docker, and they hold the logic most likely to be quietly wrong. `sandbox` needs a live stack and is covered by the end to end runs instead.
