import * as React from 'react';

export interface SelectOption { value: string; label: string }

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  /** Strings or {value,label} pairs. */
  options?: (string | SelectOption)[];
  size?: 'sm' | 'md';
  wrapperStyle?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
