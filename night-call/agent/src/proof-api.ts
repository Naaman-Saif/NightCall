import { evidenceTextOf } from './experiment-evidence.js';
import { experimentStartedOf, jobResultOf, publicationOf, refusalCode, refusalOf, requireText, startedOf } from './proof-replies.js';
import type { ContractCheck, ProofApi } from './proof-types.js';
import { toolClientFor, type ToolClient } from './tool-client.js';

const JOB_WAIT_SECONDS = 60;

type Clients = { investigator: ToolClient; verifier: ToolClient };

function contractRecorder(client: ToolClient, contractPath: string) {
  return async (checks: ContractCheck[]): Promise<string> => {
    try {
      return requireText(await client.post(contractPath, { checks }), 'contractId');
    } catch (error) {
      if (refusalCode(error) !== 'contract_exists') throw error;
      return requireText(refusalOf(error), 'contractId');
    }
  };
}

export function proofApiFor(incidentId: string, clients: Clients = { investigator: toolClientFor('investigator'), verifier: toolClientFor('verifier') }): ProofApi {
  const path = (...parts: string[]) => [`/tool/incidents/${encodeURIComponent(incidentId)}`, ...parts.map(encodeURIComponent)].join('/');
  const { investigator, verifier } = clients;
  return {
    recordContract: contractRecorder(investigator, path('contract')),
    startExperiment: async (request) => experimentStartedOf(await investigator.post(path('experiments'), request)),
    waitForJob: async (jobId, poller) => jobResultOf(await clients[poller].get(`${path('jobs', jobId)}?waitSeconds=${JOB_WAIT_SECONDS}`)),
    reviewExperiment: async (review) => void (await verifier.post(path('experiments', review.id, 'review'), { accepted: review.accepted, reasons: review.reasons })),
    proposeMitigation: async (proposal) => requireText(await investigator.post(path('mitigations'), proposal), 'mitigationId'),
    startVerification: async (ids) => startedOf(await verifier.post(path('verifications'), ids)),
    reviewVerification: async (review) => void (await verifier.post(path('verifications', review.id, 'review'), { approved: review.accepted, reasons: review.reasons })),
    readPublication: async () => publicationOf(await verifier.get(path('case'))),
    readExperimentEvidence: async (experimentId) => evidenceTextOf(await verifier.get(path('experiments', experimentId, 'evidence'))),
  };
}
