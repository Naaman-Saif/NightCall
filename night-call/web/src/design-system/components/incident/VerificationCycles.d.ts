import * as React from 'react';

export interface Cycle {
  state: 'passed' | 'failed' | 'running' | 'pending';
  /** What the cycle measured, e.g. "reproduced at 1,240 req, recovered to 96 MiB". */
  detail?: string;
  duration?: string;
}

export interface VerificationCyclesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Three cycles for a mitigation verdict. */
  cycles: Cycle[];
  /** Short description of the recorded conditions the cycles ran under. */
  conditions?: string;
}
export declare function VerificationCycles(props: VerificationCyclesProps): JSX.Element;
