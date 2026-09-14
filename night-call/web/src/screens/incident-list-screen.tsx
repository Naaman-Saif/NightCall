import { useEffect, useState } from 'react';
import { fetchIncidentList } from '../api/client';
import type { IncidentListItem } from '../api/contract';
import { describeAttention, describePhase } from '../format/incident-text';
import { formatAgo } from '../format/time';
import { useNow } from '../format/use-now';
import { Badge, Banner, DemoBadge, EmptyState } from '../kit';
import { ManualTag } from './manual-tag';
import { StartInvestigation } from './start-investigation';
import { IncidentWelcome } from '../brand/incident-welcome';

type ListProps = { showSample: boolean; isOperator: boolean };

function useIncidentList() {
  const [items, setItems] = useState<IncidentListItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    fetchIncidentList().then(setItems, () => setLoadFailed(true));
  }, []);
  return { items, loadFailed };
}

export function IncidentListScreen({ showSample, isOperator }: ListProps) {
  const { items, loadFailed } = useIncidentList();
  const linkPrefix = isOperator ? '/op/incidents/' : '/incidents/';
  return (
    <div className="page">
      <IncidentWelcome />
      {isOperator && <StartInvestigation />}
      {loadFailed && <Banner tone="critical" title="The incident list could not be loaded">Try again in a moment.</Banner>}
      {items?.length === 0 && <EmptyState compact icon="moon" title="No incidents yet" />}
      <div className="incident-list">
        {items?.map((item) => <IncidentRow key={item.id} item={item} linkPrefix={linkPrefix} />)}
        {showSample && <SampleRow />}
      </div>
    </div>
  );
}

function IncidentRow({ item, linkPrefix }: { item: IncidentListItem; linkPrefix: string }) {
  const now = useNow();
  return (
    <a className="incident-row" href={`${linkPrefix}${encodeURIComponent(item.id)}`}>
      <span className="meta">{item.label}</span>
      <span className="incident-row-title">
        {item.alertName} <span className="meta">{item.service}</span>
      </span>
      <ManualTag alertName={item.alertName} />
      {item.illustrative && <DemoBadge />}
      {item.attention !== 'none' && <Badge tone="accent">{describeAttention(item)}</Badge>}
      <span className="meta">{describePhase(item)}</span>
      <span className="meta">started {formatAgo(item.startedAt, now)}</span>
    </a>
  );
}

function SampleRow() {
  return (
    <a className="incident-row" href="/incidents/sample?fixture=sample">
      <span className="meta">SAMPLE</span>
      <span className="incident-row-title">Sample incident replayed in your browser</span>
      <DemoBadge />
    </a>
  );
}
