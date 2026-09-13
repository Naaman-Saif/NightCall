import * as React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string;
  title?: string;
  /** One line of muted prose. Never an illustration. */
  children?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
