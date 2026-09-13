import type { SubmitAnswer } from '../api/client';
import type { IncidentEvent, Snapshot } from '../api/contract';
import type { IncidentView } from '../api/use-incident-stream';
import { Banner, EmptyState } from '../kit';
import { BriefBlock } from './brief-block';
import { ChartsPanel } from './charts-panel';
import { ExperimentsPanel } from './experiments-panel';
import { HypothesesPanel } from './hypotheses-panel';
import { IncidentHeader } from './incident-header';
import { QuestionColumn } from './question-column';
import { ResultPanel } from './result-panel';
import { RolesStrip } from './roles-strip';
import { Timeline } from './timeline';
import { VerificationPanel } from './verification-panel';

type IncidentScreenProps = { view: IncidentView; isOperator: boolean; isSample: boolean; submitAnswer: SubmitAnswer };
type MainSectionsProps = { snapshot: Snapshot; events: IncidentEvent[]; isSample: boolean };

export function IncidentScreen(props: IncidentScreenProps) {
  if (props.view.loadFailed) {
    return <EmptyState icon="triangle-alert" title="This incident could not be loaded">Check the link or open the incident list.</EmptyState>;
  }
  if (!props.view.snapshot) return <EmptyState icon="loader-circle" title="Loading the incident" />;
  return <IncidentLayout {...props} snapshot={props.view.snapshot} />;
}

function IncidentLayout({ snapshot, view, isOperator, isSample, submitAnswer }: IncidentScreenProps & { snapshot: Snapshot }) {
  return (
    <div className="page">
      <IncidentHeader incident={snapshot.incident} connection={view.connection} />
      {!isOperator && <PublicBanner />}
      <div className="incident-columns" data-layout={phoneLayoutFor(snapshot)}>
        <MainSections snapshot={snapshot} events={view.events} isSample={isSample} />
        <aside className="incident-aside">
          <QuestionColumn questions={snapshot.questions} context={snapshot.context} isOperator={isOperator} submitAnswer={submitAnswer} />
        </aside>
      </div>
    </div>
  );
}

function MainSections({ snapshot, events, isSample }: MainSectionsProps) {
  return (
    <section className="incident-main">
      <BriefBlock brief={snapshot.brief} />
      <VerificationPanel snapshot={snapshot} />
      <ResultPanel snapshot={snapshot} />
      <RolesStrip roles={snapshot.roles} />
      <Timeline events={events} />
      <HypothesesPanel snapshot={snapshot} />
      <ExperimentsPanel experiments={snapshot.experiments} />
      <ChartsPanel incident={snapshot.incident} isSample={isSample} />
    </section>
  );
}

function phoneLayoutFor(snapshot: Snapshot): 'question-first' | 'story-first' {
  const hasOpenQuestion = snapshot.questions.some((question) => !question.answer);
  return snapshot.incident.lifecycle === 'active' && hasOpenQuestion ? 'question-first' : 'story-first';
}

function PublicBanner() {
  return (
    <Banner tone="readonly" title="Public read-only view">
      This page updates live. Answers to questions are given by the operator and shown here once recorded.
    </Banner>
  );
}
