import type { IncidentMarker } from '../api/markers';
import type { Series } from '../api/series';
import { formatClock } from '../format/time';
import { readCpuPercent, readMemoryMib } from './chart-panels';

function formatReading(value: number | null): string {
  return value === null ? 'no reading' : value.toFixed(1);
}

export function ChartTable({ series, markers }: { series: Series; markers: IncidentMarker[] }) {
  return (
    <details className="chart-table">
      <summary>Table view</summary>
      <div className="table-scroll">
        <MarkerTable markers={markers} />
        <SampleTable series={series} />
      </div>
    </details>
  );
}

function MarkerTable({ markers }: { markers: IncidentMarker[] }) {
  return (
    <table>
      <thead>
        <tr><th scope="col">Time</th><th scope="col">Event</th></tr>
      </thead>
      <tbody>
        {markers.map((marker) => (
          <tr key={`${marker.kind}-${marker.at}`}><td>{formatClock(marker.at)}</td><td>{marker.label}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function SampleTable({ series }: { series: Series }) {
  return (
    <table>
      <thead>
        <tr><th scope="col">Time</th><th scope="col">Memory, MiB</th><th scope="col">CPU, percent</th></tr>
      </thead>
      <tbody>
        {series.samples.map((sample) => (
          <tr key={sample.at}>
            <td>{formatClock(sample.at)}</td><td>{formatReading(readMemoryMib(sample))}</td><td>{formatReading(readCpuPercent(sample))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
