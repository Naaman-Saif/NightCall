import * as React from 'react';

export interface TabItem { value: string; label: string; icon?: string; count?: number }

/**
 * Section switcher inside the incident workspace.
 */
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  items: (string | TabItem)[];
  value: string;
  onChange?: (value: string) => void;
}
export declare function Tabs(props: TabsProps): JSX.Element;
