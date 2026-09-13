import * as React from 'react';
import type { Claim } from './ClaimLabel';

export interface HypothesisCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 1-based; rendered as H1/H2/H3. Up to three, only when warranted. */
  index?: number;
  title: React.ReactNode;
  claim?: Claim;
  qualifier?: string;
  /** Evidence for — each entry cites a measurement. */
  supporting?: React.ReactNode[];
  /** Evidence against — never omit these to make a hypothesis look stronger. */
  contradicting?: React.ReactNode[];
  /** What the investigation will do next to move this claim. */
  nextStep?: React.ReactNode;
  active?: boolean;
}
export declare function HypothesisCard(props: HypothesisCardProps): JSX.Element;
