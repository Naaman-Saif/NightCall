import { newLedger, seedEvidenceIds } from './evidence-ledger.js';
import { incidentApiFor, type IncidentApi } from './incident-api.js';
import { investigate } from './investigation.js';
import type { IncidentFacts } from './lead-prompts.js';
import { leadFor } from './lead-steps.js';
import { logProgress } from './progress.js';
import { proofApiFor } from './proof-api.js';
import { newRun, type RunTiming } from './run-steps.js';
import { toolClientFor } from './tool-client.js';

type CaseIncident = Partial<IncidentFacts> & { startedAt?: string; deadlineAt?: string };

async function caseOrEmpty(api: IncidentApi): Promise<Record<string, unknown>> {
  try {
    return await api.readCase();
  } catch (error) {
    logProgress({ caseUnavailable: String(error).slice(0, 200) });
    return {};
  }
}

function incidentOf(snapshot: Record<string, unknown>): CaseIncident {
  return (snapshot.incident ?? {}) as CaseIncident;
}

function factsOf(incident: CaseIncident): IncidentFacts {
  return { service: incident.service ?? 'recommendation', alertName: incident.alertName ?? 'recommendation alarm' };
}

function momentOf(text: string | undefined): number | undefined {
  const moment = Date.parse(text ?? '');
  return Number.isNaN(moment) ? undefined : moment;
}

function timingOf(incident: CaseIncident): RunTiming {
  return { openedAt: momentOf(incident.startedAt), deadline: momentOf(incident.deadlineAt) };
}

export async function runInvestigation(incidentId: string): Promise<void> {
  const api = incidentApiFor(toolClientFor('lead'), incidentId);
  const ledger = newLedger();
  const snapshot = await caseOrEmpty(api);
  seedEvidenceIds(ledger, snapshot);
  const incident = incidentOf(snapshot);
  const parts = { api, ledger, lead: leadFor(factsOf(incident)), proof: proofApiFor(incidentId), run: newRun(timingOf(incident)) };
  const decision = await investigate(parts);
  logProgress({ incidentId, mode: 'investigate', finished: true, ...decision, evidence: [...ledger.ids], hypotheses: ledger.hypotheses });
}
