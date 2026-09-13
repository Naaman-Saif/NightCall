import type { Incident } from '../api/contract';
import type { Series } from '../api/series';
import { useIncidentSeries, type SeriesStatus } from '../api/use-incident-series';
import { bytesToMib, cpuPoints, memoryPoints } from '../format/series-points';
import { Card, DemoBadge, MetricChart } from '../kit';

type WaitingStatus = Exclude<SeriesStatus, 'ready'>;

const WAITING_TEXT: Record<WaitingStatus, string> = {
  sample: 'No measurements in sample mode. Live incidents show memory and CPU from the recorder.',
  loading: 'Loading measurements.',
  unavailable: 'Measurements are not available for this incident yet.',
};

export function ChartsPanel({ incident, isSample }: { incident: Incident; isSample: boolean }) {
  const { status, series } = useIncidentSeries({ incident, isSample });
  const title = `Memory and CPU for ${incident.service}`;
  return (
    <Card eyebrow="Observation" title={title} actions={incident.illustrative && <DemoBadge />} className="section-charts">
      {status === 'ready' && series ? (
        <SeriesCharts series={series} isIllustrative={incident.illustrative} />
      ) : (
        <p className="muted">{WAITING_TEXT[status === 'ready' ? 'unavailable' : status]}</p>
      )}
    </Card>
  );
}

function SeriesCharts({ series, isIllustrative }: { series: Series; isIllustrative: boolean }) {
  const limitMib = series.limitBytes === null ? undefined : bytesToMib(series.limitBytes);
  return (
    <div className="chart-grid">
      <MetricChart
        unit="MiB"
        series={memoryPoints(series.samples)}
        limit={limitMib}
        limitLabel={limitMib === undefined ? undefined : `${limitMib} MiB limit`}
        xLabel="memory, last 30 min"
        demo={isIllustrative}
      />
      <MetricChart unit="% CPU" series={cpuPoints(series.samples)} xLabel="CPU, last 30 min" color="var(--observed-400)" demo={isIllustrative} />
    </div>
  );
}
