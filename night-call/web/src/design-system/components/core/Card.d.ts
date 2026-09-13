import * as React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  /** Uppercase kicker above the title. */
  eyebrow?: string;
  /** Right-aligned controls in the header. */
  actions?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'accent' | 'critical';
  /** Applies the reserved accent glow — at most one live element per view. */
  live?: boolean;
  children?: React.ReactNode;
}
export declare function Card(props: CardProps): JSX.Element;
