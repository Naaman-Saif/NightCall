import { newLedger, seedEvidenceIds } from './evidence-ledger.js';
import { incidentApiFor, type IncidentApi } from './incident-api.js';
import { investigate } from './investigation.js';
import type { IncidentFacts } from './lead-prompts.js';
import { leadFor } from './lead-steps.js';
import { logProgress } from './progress.js';
import { toolClientFor } from './tool-client.js';

async function caseOrEmpty(api: IncidentApi): Promise<Record<string, unknown>> {
  try {
    return await api.readCase();
  } catch (error) {
    logProgress({ caseUnavailable: String(error).slice(0, 200) });
    return {};
  }
}

function factsOf(snapshot: Record<string, unknown>): IncidentFacts {
  const incident = (snapshot.incident ?? {}) as Partial<IncidentFacts>;
  return { service: incident.service ?? 'recommendation', alertName: incident.alertName ?? 'recommendation alarm' };
}

export async function runInvestigation(incidentId: string): Promise<void> {
  const api = incidentApiFor(toolClientFor('lead'), incidentId);
  const ledger = newLedger();
  const snapshot = await caseOrEmpty(api);
  seedEvidenceIds(ledger, snapshot);
  const decision = await investigate({ api, ledger, lead: leadFor({ api, ledger }, factsOf(snapshot)) });
  logProgress({ incidentId, mode: 'investigate', finished: true, ...decision, evidence: [...ledger.ids], hypotheses: ledger.hypotheses });
}
