import type { EvidenceLedger } from './evidence-ledger.js';

export type IncidentFacts = { service: string; alertName: string };

export const LEAD_SYSTEM_PROMPT = [
  'You look for the cause of a live production incident in an online shop and write for NightCall\'s incident report.',
  'Base every statement on the readings you are given and cite their evidence ids exactly.',
  'Never say anything is proven or confirmed; say what the evidence suggests.',
  'Quote numbers only exactly as they appear in the readings you cite. If the failure rate reads 0% or could not be measured, never say requests are failing.',
  'Write short, plain sentences for a developer on call who was just woken up.',
  'Write as the report itself: never mention agents, roles, models, tools or yourself.',
].join(' ');

export function readingsBlock(ledger: EvidenceLedger): string {
  const blocks = [...ledger.readings.entries()].map(([evidenceId, reading]) => `evidenceId ${evidenceId} (${reading.reader}):\n${reading.summary}\n${reading.excerpt}`);
  return blocks.length > 0 ? blocks.join('\n\n') : 'No readings were recorded.';
}

export function causesTask(facts: IncidentFacts, readings: string): string {
  return [
    `The ${facts.service} service has an incident ("${facts.alertName}"). These production readings were recorded, each with its evidenceId:`,
    readings,
    'Propose one to three possible causes these readings point to. For each give:',
    'claim: one or two plain sentences a developer can act on;',
    'supportingEvidenceIds: the readings that point to it;',
    'contradictingEvidenceIds: the readings that point against it, empty if none;',
    'confirmWith: the check or test that would confirm it.',
    'Look at whether memory climbs before each out-of-memory restart, and at recent changes to the feature flag file in the deploy history.',
  ].join('\n');
}

export function classifyTask(answer: string): string {
  return [
    'The developer on call was asked whether the current failure rate is tolerable while a fix is tested, or whether the safest fix should be rushed.',
    `They answered: "${answer}"`,
    'Choose rush if they want the fix fast or the answer is unclear; choose tolerable if they can live with the failures for now. Give a one sentence reason.',
  ].join('\n');
}
