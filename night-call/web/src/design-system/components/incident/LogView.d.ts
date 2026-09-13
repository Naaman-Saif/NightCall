import * as React from 'react';

export interface LogLine { ts?: string; level?: 'error' | 'warn' | 'info' | 'debug'; text: string }

export interface LogViewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Excerpts only — never a full stream. Strings or structured lines. */
  lines: (string | LogLine)[];
  title?: string;
  /** Where the excerpt came from. */
  source?: string;
  maxHeight?: number;
  demo?: boolean;
}
export declare function LogView(props: LogViewProps): JSX.Element;
