import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Tabular figures. */
  numeric?: boolean;
  wrapperStyle?: React.CSSProperties;
}
export declare function Textarea(props: TextareaProps): JSX.Element;
