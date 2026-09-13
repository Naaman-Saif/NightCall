import * as React from 'react';

export type Claim = 'observed' | 'hypothesis' | 'inconclusive' | 'reproduced' | 'verified' | 'failing';

/**
 * The closed claim vocabulary — the only legal way to state investigation status.
 */
export interface ClaimLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  claim?: Claim;
  size?: 'sm' | 'md';
  /** Boundary text shown beside the label, e.g. "in sandbox, under recorded conditions". */
  qualifier?: string;
}
export declare function ClaimLabel(props: ClaimLabelProps): JSX.Element;
export declare const CLAIMS: Record<Claim, { label: string; fg: string; bg: string; bd: string; icon: string }>;
