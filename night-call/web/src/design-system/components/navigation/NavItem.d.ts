import * as React from 'react';

export interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  label: string;
  active?: boolean;
  /** Trailing count. */
  badge?: React.ReactNode;
  /** Icon-only rail mode (56px rail). */
  collapsed?: boolean;
}
export declare function NavItem(props: NavItemProps): JSX.Element;
