import * as React from 'react';

/**
 * Single-line field.
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  /** Helper text under the field; muted. */
  hint?: string;
  /** Replaces hint and turns the field red. */
  error?: string;
  /** Leading Lucide glyph. */
  icon?: string;
  /** Tabular figures — use for ids, durations, request counts. */
  numeric?: boolean;
  size?: 'sm' | 'md';
  wrapperStyle?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
