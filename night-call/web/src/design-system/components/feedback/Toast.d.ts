import * as React from 'react';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'neutral' | 'verified' | 'critical';
  title: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  children?: React.ReactNode;
}
export declare function Toast(props: ToastProps): JSX.Element;
