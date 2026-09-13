import type { Evidence, RunReport, RunStep } from '../api/contract';
import { describeRunStatus } from '../format/run-status-text';
import { SourceLinks } from './source-links';

type EvidenceById = Record<string, Evidence>;
type ListProps = { title: string; emptyText: string; items: string[]; isMuted?: boolean };

export function RunReportSummary({ report, evidence }: { report: RunReport; evidence: EvidenceById }) {
  return (
    <section className="run-report" data-run-status={report.status}>
      <NowLine report={report} />
      <div>
        <div className="eyebrow">What NightCall did</div>
        <ul className="report-list">
          {report.did.length === 0 && <li className="muted">Nothing yet.</li>}
          {report.did.map((step, index) => (
            <StepLine key={`${index}-${step.text}`} step={step} evidence={evidence} />
          ))}
        </ul>
      </div>
      <ReportList title="What it found" emptyText="Nothing established yet." items={report.found} />
      {report.notDone.length > 0 && <ReportList title="Not done yet" emptyText="" items={report.notDone} isMuted />}
    </section>
  );
}

function NowLine({ report }: { report: RunReport }) {
  const isRunning = report.status === 'running';
  return (
    <p className="now-line">
      <span className="eyebrow">Now</span>
      {isRunning && (
        <span className="now-dot" data-connection="live" aria-hidden>
          <span className="connection-dot-ring"><span className="connection-dot" /></span>
        </span>
      )}
      <span>{describeRunStatus(report)}</span>
    </p>
  );
}

function StepLine({ step, evidence }: { step: RunStep; evidence: EvidenceById }) {
  const exactDataLink = step.evidenceId ? evidence[step.evidenceId]?.sourceLinks?.slice(0, 1) : undefined;
  return (
    <li>
      {step.value ? `${step.text}: ${step.value}` : step.text}
      <SourceLinks links={exactDataLink} />
    </li>
  );
}

function ReportList({ title, emptyText, items, isMuted = false }: ListProps) {
  return (
    <div>
      <div className="eyebrow">{title}</div>
      <ul className="report-list" data-tone={isMuted ? 'muted' : 'default'}>
        {items.length === 0 && <li className="muted">{emptyText}</li>}
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
