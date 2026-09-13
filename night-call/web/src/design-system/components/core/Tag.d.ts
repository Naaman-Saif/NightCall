import * as React from 'react';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: string;
  /** Renders a remove affordance. */
  onRemove?: () => void;
  selected?: boolean;
  children?: React.ReactNode;
}
export declare function Tag(props: TagProps): JSX.Element;
