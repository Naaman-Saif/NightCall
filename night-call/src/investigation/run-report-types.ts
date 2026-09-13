export type RunStatus = 'not_started' | 'running' | 'stopped' | 'stalled' | 'interrupted';

export type RunStep = { text: string; value: string; evidenceId: string | null; questionId: string | null };

export type RunReport = {
  status: RunStatus;
  statusAt: string;
  note: string | null;
  nowDoing: string | null;
  did: RunStep[];
  found: string[];
  notDone: string[];
};
