import * as React from 'react';

/**
 * Action control. Primary is beacon amber and budgeted to one per view.
 */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  /** primary = the single committing action; secondary = default; ghost = in-row; danger = destructive/reject. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Lucide name rendered before the label. */
  icon?: string;
  /** Lucide name rendered after the label (external-link, chevron-right). */
  iconRight?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to container width. */
  full?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
