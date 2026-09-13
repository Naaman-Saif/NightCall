import * as React from 'react';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  /** Lucide icon name. */
  icon: string;
  size?: 'sm' | 'md' | 'lg';
  /** Required — becomes both title and aria-label. */
  label: string;
  active?: boolean;
  tone?: 'default' | 'accent' | 'danger';
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
