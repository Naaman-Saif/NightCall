import * as React from 'react';

export type Role = 'lead' | 'investigator' | 'verifier' | 'developer';

export interface RoleTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  role?: Role;
  /** inline = short name + glyph; full = full role name; avatar = 26px square glyph. */
  variant?: 'inline' | 'full' | 'avatar';
}
export declare function RoleTag(props: RoleTagProps): JSX.Element;
export declare const ROLES: Record<Role, { label: string; short: string; icon: string; color: string }>;
