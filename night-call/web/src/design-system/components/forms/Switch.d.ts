import * as React from 'react';

export interface SwitchProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'onChange'> {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  label?: React.ReactNode;
  hint?: string;
  disabled?: boolean;
}
export declare function Switch(props: SwitchProps): JSX.Element;
