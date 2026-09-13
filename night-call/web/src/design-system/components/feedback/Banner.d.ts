import * as React from 'react';

/**
 * Persistent contextual notice. `demo` is mandatory above any screen showing illustrative values.
 */
export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** demo = Illustrative demo data; readonly = public projection; info; critical. */
  tone?: 'demo' | 'info' | 'readonly' | 'critical';
  title?: string;
  /** Override the tone's default Lucide glyph. */
  icon?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}
export declare function Banner(props: BannerProps): JSX.Element;
