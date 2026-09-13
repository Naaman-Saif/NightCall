import * as React from 'react';

export interface EvidenceRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What was measured, in sentence case. */
  label: React.ReactNode;
  /** The measurement, with units. Semibold, tabular figures. */
  value: React.ReactNode;
  /** Where it came from: "otel traces", "pod metrics", "recommendationservice logs". */
  source?: string;
  /** Observation window: "02:02–02:16 UTC", "1,240 requests". */
  window?: string;
  tone?: 'default' | 'critical' | 'verified';
  href?: string;
}
export declare function EvidenceRow(props: EvidenceRowProps): JSX.Element;
