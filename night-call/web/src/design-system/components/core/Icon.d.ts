import * as React from 'react';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Lucide icon name, kebab-case. e.g. "shield-check", "flask-conical". */
  name: string;
  /** Pixel box. 16 in dense UI, 20 in the rail. */
  size?: number;
  /** Override the inherited currentColor. */
  color?: string;
  /** Accessible label; omit for decorative glyphs. */
  title?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
