import type { SubmitAnswer } from '../api/client';
import type { Snapshot } from '../api/contract';
import type { IncidentView } from '../api/use-incident-stream';
import { Banner, EmptyState } from '../kit';
import { BriefBlock } from './brief-block';
import { IncidentHeader } from './incident-header';
import { QuestionColumn } from './question-column';
import { Timeline } from './timeline';

type IncidentScreenProps = { view: IncidentView; isOperator: boolean; submitAnswer: SubmitAnswer };

export function IncidentScreen({ view, isOperator, submitAnswer }: IncidentScreenProps) {
  if (view.loadFailed) {
    return <EmptyState icon="triangle-alert" title="This incident could not be loaded">Check the link or open the incident list.</EmptyState>;
  }
  if (!view.snapshot) return <EmptyState icon="loader-circle" title="Loading the incident" />;
  return <IncidentLayout snapshot={view.snapshot} view={view} isOperator={isOperator} submitAnswer={submitAnswer} />;
}

function IncidentLayout({ snapshot, view, isOperator, submitAnswer }: IncidentScreenProps & { snapshot: Snapshot }) {
  return (
    <div className="page">
      <IncidentHeader incident={snapshot.incident} connection={view.connection} />
      {!isOperator && <PublicBanner />}
      <div className="incident-columns">
        <section className="incident-main">
          <BriefBlock brief={snapshot.brief} />
          <Timeline events={view.events} />
        </section>
        <aside className="incident-aside">
          <QuestionColumn questions={snapshot.questions} isOperator={isOperator} submitAnswer={submitAnswer} />
        </aside>
      </div>
    </div>
  );
}

function PublicBanner() {
  return (
    <Banner tone="readonly" title="Public read-only view">
      This page updates live. Answers to questions are given by the operator and shown here once recorded.
    </Banner>
  );
}
