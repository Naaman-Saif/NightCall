import * as React from 'react';

export interface DemoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Defaults to "Illustrative demo data". */
  label?: string;
}
export declare function DemoBadge(props: DemoBadgeProps): JSX.Element;
