import * as React from 'react';
import type { Claim } from './ClaimLabel';

export interface SummaryEvidence {
  /** What was measured, in a short fragment — "Memory at failure", not "The memory was measured to be". */
  label: React.ReactNode;
  /** The figure, with units. */
  value: React.ReactNode;
  tone?: 'default' | 'critical' | 'verified';
}

export interface SummaryReadout {
  /** Short caption above the figure, e.g. "Unmitigated". */
  label: React.ReactNode;
  /** The headline figure — one number, with units. */
  value: React.ReactNode;
  /** One line of context under it. */
  caption?: React.ReactNode;
  tone?: 'default' | 'critical' | 'verified';
}

/**
 * The eight-second read at the top of an incident: what happened, what proves it,
 * what changed, what to do about it. One line per block, figures over prose.
 */
export interface StaffSummaryProps extends React.HTMLAttributes<HTMLElement> {
  /** One sentence. Front-loaded with the failure, not the investigation. */
  happened: React.ReactNode;
  /** The mechanism in one line — what in the system produces that failure. */
  why?: React.ReactNode;
  /**
   * How well the mechanism is established. Defaults to 'hypothesis' on purpose:
   * a mechanism is a claim like any other and may not outrank its evidence.
   */
  whyClaim?: Claim;
  /** Boundary text for the mechanism claim. */
  whyQualifier?: string;
  /** Two to four figures. More than four and it stops being a summary. */
  evidence?: SummaryEvidence[];
  /** The unmitigated state. */
  before?: SummaryReadout;
  /** The measured state after the mitigation — never a projection. */
  after?: SummaryReadout;
  /** One line: what to do, and what it does not fix. */
  remedy?: React.ReactNode;
  claim?: Claim;
  /** Boundary text for the claim — required for reproduced/verified. */
  qualifier?: string;
  /** Trailing control, usually the PR button. */
  action?: React.ReactNode;
  /** Shows the Illustrative-demo-data marker. Default true. */
  demo?: boolean;
}
export declare function StaffSummary(props: StaffSummaryProps): JSX.Element;
