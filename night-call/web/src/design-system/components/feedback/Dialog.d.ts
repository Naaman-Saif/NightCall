import * as React from 'react';

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  title: React.ReactNode;
  eyebrow?: string;
  footer?: React.ReactNode;
  onClose?: () => void;
  /** px. 520 default; 720 for evidence-heavy dialogs. */
  width?: number;
  children?: React.ReactNode;
}
export declare function Dialog(props: DialogProps): JSX.Element;
