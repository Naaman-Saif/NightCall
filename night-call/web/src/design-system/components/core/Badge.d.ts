import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Opaque fill. Claim hues are reserved: observed/hypothesis/verified/critical always mean that state. */
  tone?: 'neutral' | 'accent' | 'observed' | 'hypothesis' | 'verified' | 'critical';
  icon?: string;
  /** Leading status dot instead of an icon. */
  dot?: boolean;
  /** Tabular figures for counts and ids. */
  numeric?: boolean;
  uppercase?: boolean;
  children?: React.ReactNode;
}
export declare function Badge(props: BadgeProps): JSX.Element;
