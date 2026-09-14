# NightCall: product and interface design brief

## Design approval update

The founder approved the visual direction of `NightCall Design System.zip` in the repository root on September 12, 2026. Use its tokens, typography, components, and incident-workspace composition as the visual reference. The original design assignment below remains as context; do not restart visual exploration unless requested.

Visual approval does not make the prototype's synthetic evidence or unfinished interactions product requirements. Preserve the agreed behavior when adapting the design:

- A mitigation is verified only after all three required cycles pass. At 2/3, show verification in progress.
- NightCall creates the mitigation PR automatically after verification. The normal handoff action is to review that PR; retry publication is available to the private operator after a publication failure.
- The illustrative LRU implementation, Kubernetes events, measurements, and recovery claims are not established facts or approved implementation choices. The cache scenario and mitigation still require independent validation against the actual Docker deployment.
- The prototype's read-only toggle is a design demonstration, not an authorization mechanism. Enforce public and private capabilities in the implementation.

This approval covers visual direction. The staged implementation plan and feasibility results remain separate deliverables.

## 1. Assignment for Claude

Design the first working NightCall product from this brief. Begin with the user journey and two low-fidelity layout approaches for the main incident workspace. Explain their trade-offs and recommend one. Get feedback before producing polished screens and a connected prototype.

The deliverable is a product design and an implementation-ready UI specification. Do not implement the backend, connect accounts, deploy a site, or invent working integrations. Use clearly labeled synthetic data for the prototype.

Design the screens, their states, their interactions, and the information hierarchy. Show how a developer can understand the incident, contribute missing context, inspect experiments, and decide whether the verified mitigation deserves a merge.

This brief records a product discovery conversation. It supersedes older NightCall documents where they describe payment failure as the flagship scenario, GitHub issues as the only interface, no human questions, or no PRs. It is a design handoff, not an approved implementation plan.

## 2. Product purpose and first customer

The first customer is a developer responsible for on-call across many services at a very small company, potentially a one-person engineering team.

The founder's motivating experience was approximately this: customer Jupyter interview sessions kept crashing after five to ten minutes, apparently involving an idle reaper. Other runtimes and connected sessions were unaffected. The exact historical incident is not established; use this as motivation, not as a verified case study.

The developer spent time both investigating the failure and correcting an LLM that jumped to solutions, hallucinated explanations, or modified code to manufacture a reproduction. They wanted senior engineering discipline: locate logs and observability, reconstruct the affected customer's conditions, compare affected and unaffected cases, and prove the actual failure before proposing a remedy.

NightCall's promise: **delegate the investigation and receive conclusions supported by inspectable experiments.**

The interface should help answer, in order:

1. What is happening to the application and its users?
2. What do we know, and what remains uncertain?
3. What is the team investigating now, and why?
4. Is there something useful I can tell it?
5. Did it reproduce the same failure under the relevant conditions?
6. What mitigation was verified, what are its trade-offs, and where is the PR?

## 3. Confirmed decisions and proposed defaults

### Confirmed with the founder

- Working product first. Submission materials, promotional sites, video production, and launch work are separate.
- Investigations start automatically from monitoring alerts.
- The NightCall incident page is the primary interaction surface. Slack and Discord are future channels for the same investigation.
- Brief the developer early. Search available evidence, surface important questions, and continue useful independent work while awaiting answers.
- Use three coordinated roles: investigation lead, experiment investigator, and independent verifier. All share the same evidence and human context.
- Form evidence-backed hypotheses. Initially consider up to three when warranted; do not fabricate alternatives just to fill slots. Revise using experiment results.
- Allow observation-only diagnostic edits inside the sandbox. The original application code must reproduce the failure before it can be called confirmed.
- Reproduction must match the incident's symptoms and repeat reliably under documented conditions.
- Verify the mitigation across three clean reproduction-and-recovery cycles.
- Investigate for up to 30 minutes. If sufficient proof is unavailable, report the unresolved investigation and do not open a mitigation PR.
- First deliver a verified mitigation, explicitly distinguished from a repair of the underlying defect.
- Apply experiments and mitigation only in the sandbox. Open a PR against a dedicated application demo branch; a human decides whether to merge and deploy.
- The public demo is read-only. The developer needs a private way to supply context on the same incident experience.
- One convincing conditional incident is the first product proof. The selected candidate is recommendation cache growth under traffic in Astronomy Shop.

### Proposed design defaults, open to refinement

- Desktop-first incident workspace with responsive tablet and mobile review layouts.
- Use the approved visual direction from `NightCall Design System.zip`, as recorded above. Adapt layouts for required states and responsive behavior without reopening the visual direction.
- Four core screen types, with drawers and inline states for supporting interactions. Avoid growing this into a general monitoring dashboard.
- One preconfigured application for the first version. Show source readiness, but defer self-service onboarding, billing, organization management, and integration marketplaces.
- Structured progress events drive the interface. Show concise evidence-backed explanations, not private model reasoning or an imitation terminal stream.
- Protect developer write interactions through an existing private access mechanism. Public viewers see an explicitly marked read-only projection. The exact authentication implementation is outside this design assignment.

## 4. Scenario and truth boundaries

### Selected feasibility candidate

Astronomy Shop's recommendation service includes a fault controlled by `recommendationCacheFailure`. In the inspected deployed code, repeated cache misses append product IDs and additional copies into an in-memory list. A random decision affects whether a request grows the cache. The inspected container has a 500 MiB memory limit.

These are source and configuration observations. **The fault has not yet been triggered and independently verified as the NightCall demonstration.** We do not yet know the request count, time to failure, exact visible symptoms, or mitigation recovery behavior.

The narrative to explore is: a fresh instance appears healthy, but a particular history of requests causes memory growth and eventually a user-visible failure. A single cold request may not reproduce the incident. NightCall must investigate the relevant history and conditions.

### What the design must accommodate

- An observed failure plus an unaffected comparison.
- Workload history, not only one captured request: operation, inputs, ordering, concurrency, pacing, duration, request count, and relevant initial state.
- Memory over elapsed time and request count, with the configured limit visible.
- Trace and log evidence linked to the workload and observation window.
- A failed or inconclusive initial experiment, followed by a revised experiment if the actual run warrants it. Do not script a compulsory wrong hypothesis.
- Diagnostic observations that are useful but do not yet qualify as a confirmed reproduction.
- A mitigation that may stop further growth without immediately releasing already retained memory. Recovery must be measured. Do not assume a flag revert alone restores health or that a restart alone prevents recurrence.
- Three clean verification cycles using the same documented conditions and exact proposed mitigation.

### Labels and claims

Use “Observed,” “Hypothesis,” “Inconclusive,” “Reproduced,” and “Mitigation verified” precisely. Never substitute a numerical confidence score for evidence.

Use “3/3 verification cycles passed under the recorded conditions.” Do not display “100% certain,” “guaranteed fixed,” or “production resolved” based on sandbox results.

All prototype measurements, timestamps, logs, PR URLs, and outcomes must be visibly labeled “Illustrative demo data.” Use a reserved example domain for sample links. Do not mix illustrative results with live box observations.

## 5. The three-role investigation team

| Role | Responsibility | Visible output | Boundary |
| --- | --- | --- | --- |
| Investigation lead | Build situational awareness, gather evidence, maintain hypotheses, ask focused questions, coordinate the case | Incident brief, knowns/unknowns, hypothesis updates, questions, next step | Does not declare a hypothesis proven without experiment evidence |
| Experiment investigator | Define and run controlled reproduction and mitigation experiments through bounded tools | Experiment purpose, setup, changes, measurements, results, limitations | Cannot alter application behavior to manufacture the target failure |
| Independent verifier | Challenge symptom matching, experimental controls, original-code reproduction, and mitigation repeatability | Check-by-check review, missing evidence, rejection reasons, verification-cycle verdicts | Cannot convert absent evidence or a majority opinion into a pass |

Each role should have an understandable status: ready, working, waiting for evidence, waiting for context, reviewing, or finished. Show its current assignment and most recent substantive update.

Roles operate within one investigation. A developer's answer updates the shared context; they never need to repeat the answer to separate agent chats. Preserve earlier findings and explicitly mark corrections or superseded hypotheses.

The independent verifier can reject a reproduction and send the case back for another experiment. Represent this as a normal investigation event with a reason, not as a system crash.

## 6. User journey and navigation

### Primary journey

Alert received → incident opens automatically → early incident brief → evidence collection and questions → hypotheses and experiments → original-code reproduction confirmed → mitigation proposed and tested → three-cycle verification → PR prepared and published → human handoff.

The journey is not a rigid wizard. Evidence gathering, questions, and independent tasks can overlap. Experiments may return to hypothesis revision. The verifier may request more evidence. A progress indicator must not imply that every stage is complete merely because a later activity has started.

### Core screens

| Screen | Proposed route | Primary purpose |
| --- | --- | --- |
| Incident inbox | `/incidents` | Find active work, questions requiring attention, and completed investigations |
| Incident workspace | `/incidents/:incidentId` | Understand and participate in the investigation as it unfolds |
| Experiment detail | `/incidents/:incidentId/experiments/:experimentId` | Inspect an experiment's setup, evidence, controls, and verdict |
| Verification and handoff | `/incidents/:incidentId/result` | Review the exact mitigation, proof, limitations, and PR |

Evidence inspection, source readiness, question composition, and detailed role activity should be supporting panels or drawers. They do not each need a top-level product section. Preserve deep links where useful.

## 7. Screen requirements

### Screen A: Incident inbox

**First impression:** what is being investigated, what needs my context, and what is ready for review?

Required information per incident:

- Human-readable incident title and application/environment.
- Affected service or services, observed symptom, and impact summary.
- Alert severity if provided by the source. Unknown impact stays unknown.
- Started time, elapsed time, latest substantive activity, and investigation status.
- Attention indicator with the number of open questions, distinguishing blocking questions.
- Reproduction status and mitigation/PR status as distinct facts.

Provide simple filters for active, needs context, ready for review, and finished. Prioritize attention without creating a distracting wall of summary metrics.

Interactions: open an incident, open its unanswered questions, open its final result. No public “trigger fault,” “run agent,” “merge,” or “apply to production” controls.

Design states: no incidents yet; one active incident; several incidents; new question; verified mitigation awaiting review; unresolved investigation; data loading; connection failure with last known data retained.

### Screen B: Incident workspace

This is the product's main screen. Lead with the investigation story, not raw tools.

**Persistent incident identity**

- Title, application, environment, affected services, alert origin, start time.
- Current phase/activity, elapsed time, and remaining investigation budget when available.
- Clear distinction between sandbox work and the running application.
- Private operator or public read-only mode.

**Living incident brief**

- What users are experiencing, with evidence links.
- Affected and unaffected conditions, when known.
- Relevant timeline: symptom onset, deployment/config changes, restarts, workload changes, human observations.
- Confirmed facts, open questions, and the next experiment with its purpose.
- Brief revision time and links to the evidence behind meaningful changes.

**Context exchange**

- Focused questions from the investigation lead, each explaining why the answer matters.
- Indication of whether the whole investigation or only one task is waiting.
- Text answer, optional suggested responses when meaningful, and “I don't know.”
- Ability to add unsolicited relevant context and to correct an earlier answer.
- Acknowledgment that the answer was received and which investigation task it informs.
- Human statements labeled as human-provided context until independently corroborated.
- Public viewers cannot respond and see only context approved for the public projection.

**Team and hypotheses**

- Compact view of the three roles, assignments, and meaningful status updates.
- Hypothesis cards containing the claim, supporting/contradicting evidence, predicted observable result, and planned or completed experiment.
- Statuses: proposed, testing, supported, contradicted, inconclusive, or superseded.
- No forced three-card layout when only one hypothesis is justified.

**Experiment progress**

- Active experiment question, controlled variables, workload progress, and new measurements.
- Distinguish planned steps from steps actually executed.
- Link to experiment detail and show a concise result when it completes.
- Verifier challenges appear beside the claim they challenge.

**Chronological record**

Group events by meaningful activity: evidence found, hypothesis revised, experiment started, symptom comparison completed, question answered, verifier review, mitigation trial, PR publication. Raw logs remain behind evidence links. Do not auto-scroll the developer away from something they are reading.

Design states: first alert with incomplete brief; gathering evidence; actionable question while work continues; fully blocked; experiment running; reproduction rejected; reproduction confirmed; mitigation testing; deadline reached; infrastructure error; completed handoff; reconnecting; owner input failed to save.

### Screen C: Experiment detail

The experiment must read like an inspectable engineering record.

**Before the result**

- The hypothesis or mitigation being tested and why this experiment can distinguish it.
- Expected observations and pass/fail criteria recorded before execution.
- Original incident evidence being compared.
- Application revision/image identity, relevant config, memory limit, and initial state.
- Workload recipe: operation, safe inputs, sequence, concurrency, pacing, count, and duration.
- What changed, what remained fixed, and whether diagnostic instrumentation was present.
- Fresh-environment/reset evidence and original-code identity.

**During and after execution**

- Actual progress, request counts, start/end times, and measurements.
- For the cache scenario, memory over time/request count, limit, error observations, and restarts if actually observed.
- A symptom comparison table: production observation, sandbox observation, matching rule, verdict, evidence link.
- Baseline/negative-control results. A healthy control matters as much as a failing target case.
- Verdict: matches, differs, inconclusive, invalid experiment, or execution failed.
- Verifier assessment, remaining limitations, and the next action.

Observation-only instrumentation receives an explicit badge. A reproduction observed only with diagnostic edits remains provisional until confirmed on the original application code.

Design states: planned; setting up; running; partial measurements; completed non-match; insufficient evidence; diagnostic-only match; original-code match; timed out; cleanup failed.

### Screen D: Verification and handoff

The opening summary should make clear whether the developer has a verified mitigation, an unresolved incident, or a completed investigation with a delivery problem.

For a verified mitigation, show:

- What was reproduced and the required conditions.
- The mitigation, why it helps, expected operational trade-offs, and what it does not repair.
- The exact configuration diff and the tested application revision.
- Three verification-cycle rows, each showing clean reset, healthy baseline, reproduction match, mitigation applied in sandbox, recovery checks, and verdict.
- Links from every row to the underlying experiment/evidence.
- Independent verifier approval with explicit checks, not a generic confidence badge.
- PR state and link; target repository/branch and the exact proposed change.
- Human next step and an explicit statement that NightCall has not deployed the mitigation to the running application.

For unresolved cases, show the strongest supported findings, excluded hypotheses, unsuccessful experiments, missing evidence, and useful next steps. Do not display a success-themed empty PR card.

If verification passed but PR creation failed, retain the verified result and show publication failure separately. The operator may retry publication; the public view is informational. Do not claim the tests failed or erase their evidence.

Design states: verification in progress; one cycle fails; all cycles pass; mitigation has operational caveats; PR publishing; PR published; PR publication failed; unresolved at deadline; no acceptable mitigation despite successful reproduction.

### Supporting panels

**Evidence inspector:** provenance, source time, collection time, exact excerpt/measurement, relevant labels, surrounding context where safe, linked claims, and access limitations. Present text safely. An unavailable source link must not erase a retained evidence excerpt.

**Source readiness:** configured application/repository, alert source, logs, traces, metrics, sandbox availability, model availability, and PR publication readiness. Show connected/unavailable/stale/not configured and the consequence. Sentry is a future possible source, not a connected integration today. No credential-entry UI is required for the first design.

**Role activity:** current assignment, inputs consulted, concise finding, next action, and linked artifacts. Do not create three independent conversational histories for the human to manage.

## 8. State model for the design

These are proposed UI contract values, not existing backend functionality.

| Dimension | Values/examples | Why separate |
| --- | --- | --- |
| Lifecycle | queued, active, finished | Whether investigation work is in progress |
| Current phase | briefing, investigating, reproducing, mitigating, verifying, publishing, handoff | What is happening now; movement backward is allowed |
| Attention | none, context requested, blocked | A question can exist while other work continues |
| Reproduction | untested, testing, provisional, confirmed, not reproduced, inconclusive | A diagnostic match is not an original-code confirmation |
| Mitigation | not proposed, proposed, testing, verified, failed, inconclusive | Reproduction does not imply an effective mitigation |
| Completion reason | completed, budget exhausted, insufficient evidence, infrastructure failure, interrupted | A timeout is different from a refuted hypothesis |
| PR publication | not eligible, pending, publishing, published, failed | A GitHub outage does not negate proof |
| Data connection | current, reconnecting, stale, unavailable | Connection loss does not mean the investigation stopped |
| Viewer capability | public reader, private operator | Only the private operator can provide context or retry publication |

Important transition: experiment result → verifier rejects claimed match → new evidence request or revised experiment. Keep the rejected result in history with its reason.

At the 30-minute deadline, active work must stop within bounded cancellation behavior, its state must be recorded, and cleanup may still be in progress. The page must not silently keep counting toward an invented completion estimate.

After a process interruption, show the interruption and actual recovery status. Never imply that an experiment continued uninterrupted or count an incomplete cycle as a pass.

## 9. Data required by the interface

The designer should use these objects to build consistent fixtures. Field names are proposed, and implementation may refine storage. Required meaning must remain intact. Use UTC ISO timestamps in data and clearly labeled local/relative time in presentation. Unknown numeric measurements are null, never zero.

| Object | Required data |
| --- | --- |
| Application | id, name, environment, repository, monitored services, source readiness, viewer capabilities |
| Incident | id, title, alert source/reference, severity if known, affected services, observed impact, startedAt, lastActivityAt, deadlineAt, lifecycle, phase, attention, completion reason |
| Incident brief | revision, summary, affected conditions, unaffected conditions, known facts with evidence IDs, unknowns, relevant timeline, next step, updatedAt |
| Evidence | id, kind, source/service, observedAt or observation window, collectedAt, summary, safe payload/excerpt, units where applicable, trace/request correlation, source link if accessible, completeness, origin, visibility classification |
| Human context | id, questionId if applicable, author, text, suppliedAt, revision/superseded record, related evidence/experiment IDs, public-safe representation if any |
| Question | id, text, whyItMatters, requesting role, blocking scope, suggested responses if useful, askedAt, state, answer/context IDs |
| Role activity | role ID, status, assignment, current hypothesis/experiment ID, concise update, linked evidence, updatedAt |
| Hypothesis | id, claim, rationale summary, supporting and contradicting evidence IDs, predicted observations, status, related experiment IDs, supersedes ID if revised |
| Workload recipe | id, observed request provenance, operation/input summary, safe replay inputs, sequence, pacing, concurrency, count/duration limits, required initial state, substitutions, fidelity limitations |
| Symptom contract | id, source incident observations, required checks, comparison rules/tolerances, evidence requirements, recordedAt before execution |
| Experiment | id, purpose, hypothesis/mitigation ID, expected observations, symptom contract ID, application/config identities, sandbox settings, controlled variables, workload ID, diagnostic patch status, baseline/reset status, timing, measurements, verdict, evidence IDs, verifier assessment |
| Measurement series | name, unit, timestamps or elapsed values, samples, source, collection interval, missing-sample indicators, relevant limit/threshold |
| Verification cycle | id, cycle number, clean reset evidence, original-code identity, baseline checks, reproduction experiment ID, exact mitigation identity, recovery checks, verdict, limitations |
| Mitigation | id, explanation, classification=mitigation, proposed diff, tested identity, operational caveats, expected benefit, what remains unfixed, cycle IDs, verifier verdict |
| PR publication | state, repository, base branch/revision, proposed branch/change identity, URL and number when real, publishedAt, failure reason and retry availability |
| Investigation event | id, incidentId, sequence, occurredAt, actor/role, event type, concise summary, related object IDs |

Evidence origin must distinguish observed telemetry, human statements, agent hypotheses, sandbox measurements, and illustrative prototype data. A statement's appearance in the activity feed does not change its evidence status.

### Prototype fixture set

Create one internally consistent fictional cache investigation with these snapshots:

1. Alert just received; impact partly unknown; brief forming.
2. Early brief with a question about when the behavior began; evidence work continues.
3. A hypothesis and an experiment that does not yet establish reproduction.
4. A revised workload experiment with memory measurements and a healthy comparison.
5. Diagnostic-only observation challenged by the verifier.
6. Original-code reproduction accepted with linked checks.
7. Mitigation verification showing one, then two, then three completed cycles.
8. Verified mitigation and a fictional PR handoff.

Provide alternative fixtures for deadline exhaustion, missing telemetry, failed verification, and PR publication failure. These are design states, not a claim that the real investigation must follow this exact sequence.

Do not invent a specific number of affected customers. If illustrative charts use numbers, make units, sampling, limits, and missing values consistent across all screens. A cycle cannot pass while one of its required checks is missing or failed.

## 10. Proposed frontend/backend contract

This section describes interfaces the UI would need. Apart from alert ingestion, they are not implemented today. The designer should document how each screen consumes them, rather than assume a connector provides them.

| Interface | Purpose | Access |
| --- | --- | --- |
| `POST /alerts` | Existing Alertmanager ingress that creates/deduplicates incidents | Private infrastructure |
| `GET /api/incidents` | Incident list with attention and outcome summaries | Public-safe or operator projection |
| `GET /api/incidents/:id` | Current incident snapshot, brief, references, and capabilities | Viewer-specific projection |
| `GET /api/incidents/:id/events` | Ordered progress stream with reconnect cursor, proposed as server-sent events | Viewer-specific projection |
| `GET /api/incidents/:id/experiments/:experimentId` | Full inspectable experiment record | Viewer-specific projection |
| `GET /api/incidents/:id/evidence/:evidenceId` | Retained evidence and provenance | Viewer-specific projection |
| `GET /api/incidents/:id/result` | Verification and handoff state | Viewer-specific projection |
| `POST /api/incidents/:id/context` | Answer a question or add relevant context | Private operator only |
| `POST /api/incidents/:id/publication/retry` | Retry a failed PR publication using the already verified change | Private operator only |
| `GET /api/application/readiness` | Safe readiness summary and consequences of unavailable dependencies | Role-appropriate projection |

Snapshot plus ordered events should support refresh and reconnect without losing history or duplicating cards. Browser disconnects must not cancel the server-side investigation. Use stable object IDs for drill-down and event references.

Operator context submission needs pending, accepted, and failed-to-save states. Preserve unsent text across transient errors and prevent a retry from duplicating the same answer. The backend must enforce capabilities; hiding a button is not authorization.

Public data must be a filtered projection, not direct access to the state directory. Exclude credentials, raw authorization headers, sensitive personal data, and private human context. External source links may be inaccessible to public viewers; show retained safe excerpts instead.

## 11. Existing implementation and implications

NightCall already has a TypeScript/NestJS backend, Strands agents using Bedrock, Alertmanager ingestion, Docker-based sandbox orchestration, logs/traces/metrics readers, configuration snapshots, JSON state, and a minimal static status page.

The current implementation forms one triage hypothesis, replays a flag diff, tries a small remediation vocabulary, and files a GitHub issue. Its status page lists incidents and completed issue links. It does not implement the three-role investigation experience, human questions, workload-history experiments, the proposed public API, three-cycle proof, or fix PR publication.

The application and observability stack run on the provisioned box. NightCall itself was stopped at last inspection because model and GitHub configuration were missing. The founder has confirmed AWS account/access readiness, but provisioning those settings is still execution work.

Reuse the existing stack where appropriate. The design should expose the agreed product behavior without pretending unfinished capabilities already exist. Sentry, Slack, Discord, arbitrary code repair, and general-purpose application onboarding are outside the first build.

## 12. Visual and interaction direction

- Optimize for a developer trying to regain situational awareness quickly.
- Use typography and spacing to distinguish conclusions, evidence, questions, and actions.
- Keep the three-role team legible without turning it into a character-driven chat interface.
- Reserve strong attention treatments for questions, changed findings, and failed checks. Do not animate every agent event.
- Use status text and icons alongside color. Support keyboard navigation, visible focus, adequate contrast, and reduced motion.
- Let the developer inspect details progressively. Keep the incident's current meaning visible while browsing evidence.
- Preserve investigation history. Findings can be corrected, but must not disappear without explanation.
- Use real timestamps and elapsed duration. Avoid fabricated completion percentages for open-ended investigation work.
- On mobile, prioritize incident summary, questions, latest activity, and result. Detailed charts and evidence remain accessible without requiring a desktop-width canvas.
- Distinguish read-only public view and private operator view consistently across screens.
- No marketing homepage, billing screen, organization administration, arbitrary shell console, production-apply button, or fake integration marketplace.

## 13. Required design deliverables

1. A concise interpretation of the user problem and journey, calling out assumptions or conflicts in this brief.
2. Two low-fidelity incident-workspace compositions, with trade-offs and a recommendation. Pause for founder feedback before polishing.
3. A navigation map and the four core screen types with their required supporting panels.
4. A connected desktop prototype using the labeled fixture set, including context submission, evidence drill-down, verifier rejection, and final handoff.
5. Representative mobile layouts for incident review, answering a question, and reviewing a verified mitigation.
6. A reusable component inventory: incident row, brief, question card, role status, hypothesis card, experiment summary, evidence reference/inspector, symptom comparison, measurement chart, verification cycle, mitigation diff, publication status, connection state.
7. A state matrix covering loading, missing data, failures, partial progress, reconnecting, unresolved outcomes, and public/private capabilities.
8. An implementation handoff mapping each component to the data objects and actions it needs, including accessibility and responsive behavior.

### Design review checklist

- Can a developer understand what happened, what is known, and what happens next without reading the whole event history?
- Can they answer a question once and see that the shared investigation received it?
- Can they distinguish a plausible explanation, a diagnostic observation, and a verified original-code reproduction?
- Can they inspect why an experiment failed or why the verifier rejected a claim?
- Can they see the conditions, controls, and limitations behind three successful cycles?
- Is mitigation visibly different from permanent repair and from a production deployment?
- Can an unresolved investigation still provide a useful engineering handoff?
- Is every synthetic measurement and outcome clearly marked as illustrative?
- Does the design remain small enough to build around one preconfigured application and one independently validated conditional incident?

End the first design pass with the low-fidelity alternatives and the most important unresolved design questions. Do not jump directly to a complete polished application.
