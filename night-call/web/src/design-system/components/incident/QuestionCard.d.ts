import * as React from 'react';

export interface QuestionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Specific and answerable in one line. */
  question: React.ReactNode;
  /** What the answer would let the investigation do. */
  why?: React.ReactNode;
  /** The useful independent work continuing while it waits. */
  meanwhile?: React.ReactNode;
  /** Relative ask time, e.g. "asked 6 min ago". */
  asked?: string;
  answered?: boolean;
  answer?: React.ReactNode;
  /** Public projection — shows the locked affordance instead of the composer. */
  readOnly?: boolean;
  onAnswer?: (text: string) => void;
}
export declare function QuestionCard(props: QuestionCardProps): JSX.Element;
