export type RunStatus = 'not_started' | 'running' | 'stopped' | 'stalled' | 'interrupted';

export type RunStep = { text: string; value: string; evidenceId: string | null; questionId: string | null };

export type CauseEvidence = { text: string; evidenceId: string };

export type RunCause = {
  id: string;
  claim: string;
  status: 'proposed' | 'supported' | 'contradicted';
  supporting: CauseEvidence[];
  contradicting: CauseEvidence[];
  confirmBy: string;
};

export type RunReport = {
  causes: RunCause[];
  status: RunStatus;
  statusAt: string;
  note: string | null;
  nowDoing: string | null;
  did: RunStep[];
  found: string[];
  notDone: string[];
};
