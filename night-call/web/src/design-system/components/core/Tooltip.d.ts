import * as React from 'react';

export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Usually the absolute UTC timestamp or full identifier behind a shortened value. */
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}
export declare function Tooltip(props: TooltipProps): JSX.Element;
