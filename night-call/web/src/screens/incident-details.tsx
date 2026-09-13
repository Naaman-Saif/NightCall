import type { SubmitAnswer } from '../api/client';
import type { Snapshot } from '../api/contract';
import type { IncidentView } from '../api/use-incident-stream';
import { Banner } from '../kit';
import { BriefBlock } from './brief-block';
import { HypothesesPanel } from './hypotheses-panel';
import { MitigationPanel } from './mitigation-panel';
import { ReproductionPanel } from './reproduction-panel';
import { ResultPanel } from './result-panel';
import { Timeline } from './timeline';
import { UnresolvedQuestions } from './unresolved-questions';
import { VerificationPanel } from './verification-panel';
import { WhatHappenedSection } from './what-happened-section';

export type IncidentLayoutProps = {
  snapshot: Snapshot;
  view: IncidentView;
  isOperator: boolean;
  isSample: boolean;
  submitAnswer: SubmitAnswer;
};

type DetailsProps = IncidentLayoutProps & { includeQuestions: boolean };

export function IncidentDetails({ snapshot, view, isOperator, isSample, submitAnswer, includeQuestions }: DetailsProps) {
  return (
    <>
      {!isOperator && <PublicBanner />}
      <WhatHappenedSection incident={snapshot.incident} events={view.events} isSample={isSample} />
      <div className="report" data-layout={phoneLayoutFor(snapshot)}>
        <BriefBlock snapshot={snapshot} />
        <HypothesesPanel snapshot={snapshot} />
        <ReproductionPanel snapshot={snapshot} />
        <MitigationPanel snapshot={snapshot} />
        <VerificationPanel snapshot={snapshot} />
        <ResultPanel snapshot={snapshot} />
        {includeQuestions && <UnresolvedQuestions snapshot={snapshot} isOperator={isOperator} submitAnswer={submitAnswer} />}
        <Timeline events={view.events} />
      </div>
    </>
  );
}

export function hasOpenQuestion(snapshot: Snapshot): boolean {
  return snapshot.questions.some((question) => !question.answer);
}

function phoneLayoutFor(snapshot: Snapshot): 'question-first' | 'story-first' {
  return snapshot.incident.lifecycle === 'active' && hasOpenQuestion(snapshot) ? 'question-first' : 'story-first';
}

function PublicBanner() {
  return (
    <Banner tone="readonly" title="Public read-only view">
      This page updates live. Answers to questions are given by the operator and shown here once recorded.
    </Banner>
  );
}
