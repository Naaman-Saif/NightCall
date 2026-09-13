import { useMemo } from 'react';
import type { Incident, IncidentEvent } from '../api/contract';
import { useLiveChartData, type ChartData } from '../api/use-chart-data';
import { ChartTable } from '../charts/chart-table';
import { WhatHappenedChart } from '../charts/what-happened-chart';
import { hasSandboxOnlyMarker } from '../format/marker-text';
import { Card, DemoBadge } from '../kit';
import { sampleChartData } from '../sample/sample-markers';

type SectionProps = { incident: Incident; events: IncidentEvent[]; isSample: boolean };
type CardProps = { incident: Incident; data: ChartData };

const BEFORE_ALARM_NOTE = 'The shaded part is the time before the alarm fired.';
const SANDBOX_ONLY_NOTE = 'The fix was verified in the sandbox and a pull request was opened. Nothing was deployed, so the live line does not change.';

export function WhatHappenedSection({ incident, events, isSample }: SectionProps) {
  return isSample ? <SampleWhatHappened incident={incident} events={events} /> : <LiveWhatHappened incident={incident} />;
}

function LiveWhatHappened({ incident }: { incident: Incident }) {
  const isActive = incident.lifecycle === 'active';
  const data = useLiveChartData({ incidentId: incident.id, service: incident.service, isActive });
  return <WhatHappenedCard incident={incident} data={data} />;
}

function SampleWhatHappened({ incident, events }: { incident: Incident; events: IncidentEvent[] }) {
  const data = useMemo(() => sampleChartData(events), [events]);
  return <WhatHappenedCard incident={incident} data={data} />;
}

function WhatHappenedCard({ incident, data }: CardProps) {
  const title = `Memory and CPU for ${incident.service}`;
  return (
    <Card eyebrow="Measurements" title={title} actions={incident.illustrative && <DemoBadge />} className="section-what-happened">
      {data.series ? (
        <WhatHappenedChart series={data.series} markers={data.markers} />
      ) : (
        <p className="muted">{data.isLoading ? 'Loading measurements.' : 'Measurements are not available for this incident yet.'}</p>
      )}
      <ChartNotes data={data} isIllustrative={incident.illustrative} />
    </Card>
  );
}

function ChartNotes({ data, isIllustrative }: { data: ChartData; isIllustrative: boolean }) {
  return (
    <div className="chart-notes">
      {isIllustrative && data.series && <p className="chart-note">Sample measurements are illustrative, not recorded.</p>}
      {data.markers.some((marker) => marker.kind === 'alarm') && <p className="chart-note">{BEFORE_ALARM_NOTE}</p>}
      {hasSandboxOnlyMarker(data.markers) && <p className="chart-note">{SANDBOX_ONLY_NOTE}</p>}
      {!data.isLoading && !data.isMarkersAvailable && <p className="chart-note">Event markers are not available yet.</p>}
      {data.series && <ChartTable series={data.series} markers={data.markers} />}
    </div>
  );
}
