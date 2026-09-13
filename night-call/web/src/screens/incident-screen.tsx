import type { SubmitAnswer } from '../api/client';
import type { Snapshot } from '../api/contract';
import type { IncidentView } from '../api/use-incident-stream';
import { Banner, EmptyState } from '../kit';
import { BriefBlock } from './brief-block';
import { HypothesesPanel } from './hypotheses-panel';
import { IncidentHeader } from './incident-header';
import { MitigationPanel } from './mitigation-panel';
import { ReproductionPanel } from './reproduction-panel';
import { ResultPanel } from './result-panel';
import { Timeline } from './timeline';
import { UnresolvedQuestions } from './unresolved-questions';
import { VerificationPanel } from './verification-panel';
import { WhatHappenedSection } from './what-happened-section';

type IncidentScreenProps = { view: IncidentView; isOperator: boolean; isSample: boolean; submitAnswer: SubmitAnswer };

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
      <WhatHappenedSection incident={snapshot.incident} events={view.events} isSample={isSample} />
      <div className="report" data-layout={phoneLayoutFor(snapshot)}>
        <BriefBlock snapshot={snapshot} />
        <HypothesesPanel snapshot={snapshot} />
        <ReproductionPanel snapshot={snapshot} />
        <MitigationPanel snapshot={snapshot} />
        <VerificationPanel snapshot={snapshot} />
        <ResultPanel snapshot={snapshot} />
        <UnresolvedQuestions snapshot={snapshot} isOperator={isOperator} submitAnswer={submitAnswer} />
        <Timeline events={view.events} />
      </div>
    </div>
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
