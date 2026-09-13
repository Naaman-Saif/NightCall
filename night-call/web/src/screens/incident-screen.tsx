import type { SubmitAnswer } from '../api/client';
import type { RunReport } from '../api/contract';
import type { IncidentView } from '../api/use-incident-stream';
import { EmptyState } from '../kit';
import { DetailsToggle } from './details-toggle';
import { IncidentDetails, hasOpenQuestion, type IncidentLayoutProps } from './incident-details';
import { IncidentHeader } from './incident-header';
import { RunReportSummary } from './run-report';
import { UnresolvedQuestions } from './unresolved-questions';

type IncidentScreenProps = { view: IncidentView; isOperator: boolean; isSample: boolean; submitAnswer: SubmitAnswer };

export function IncidentScreen(props: IncidentScreenProps) {
  if (props.view.loadFailed) {
    return <EmptyState icon="triangle-alert" title="This incident could not be loaded">Check the link or open the incident list.</EmptyState>;
  }
  if (!props.view.snapshot) return <EmptyState icon="loader-circle" title="Loading the incident" />;
  return <IncidentLayout {...props} snapshot={props.view.snapshot} />;
}

function IncidentLayout(props: IncidentLayoutProps) {
  const { snapshot, view } = props;
  const report = snapshot.runReport;
  return (
    <div className="page">
      <IncidentHeader incident={snapshot.incident} connection={view.connection} latestSequence={view.events.at(-1)?.sequence ?? 0} runReport={report} />
      {snapshot.headline && <p className="incident-headline">{snapshot.headline}</p>}
      {report ? <ClearReport {...props} report={report} /> : <IncidentDetails {...props} includeQuestions />}
    </div>
  );
}

function ClearReport(props: IncidentLayoutProps & { report: RunReport }) {
  const isAnswerNeeded = props.isOperator && hasOpenQuestion(props.snapshot);
  return (
    <>
      <RunReportSummary report={props.report} snapshot={props.snapshot} />
      {isAnswerNeeded && <UnresolvedQuestions snapshot={props.snapshot} isOperator submitAnswer={props.submitAnswer} />}
      <DetailsToggle>
        <IncidentDetails {...props} includeQuestions={!isAnswerNeeded} />
      </DetailsToggle>
    </>
  );
}
