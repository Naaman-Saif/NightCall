import * as React from 'react';
import type { Role } from './RoleTag';

/**
 * One structured progress event in the investigation stream.
 */
export interface TimelineEventProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: Role;
  /** One line, sentence case, states what happened — not what the model was thinking. */
  title: React.ReactNode;
  /** Relative time, e.g. "4 min ago". */
  time?: string;
  /** Absolute UTC shown on hover. */
  absoluteTime?: string;
  /** Marks this as the live step (pulse + accent glow). At most one per stream. */
  running?: boolean;
  /** Suppresses the connector line on the final event. */
  last?: boolean;
  /** Attached evidence: ClaimLabel, EvidenceRow list, MetricChart, LogView. */
  meta?: React.ReactNode;
  onOpen?: () => void;
  children?: React.ReactNode;
}
export declare function TimelineEvent(props: TimelineEventProps): JSX.Element;
