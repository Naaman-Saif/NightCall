import { useCallback } from 'react';
import { postContext, type ContextAnswer } from '../api/client';
import { useIncidentStream } from '../api/use-incident-stream';
import { useSampleIncident } from '../sample/use-sample-incident';
import { IncidentScreen } from './incident-screen';

export function LiveIncidentPage({ incidentId, isOperator }: { incidentId: string; isOperator: boolean }) {
  const view = useIncidentStream(incidentId);
  const submitAnswer = useCallback(
    async (answer: ContextAnswer) => {
      await postContext(incidentId, answer);
    },
    [incidentId],
  );
  return <IncidentScreen view={view} isOperator={isOperator} isSample={false} submitAnswer={submitAnswer} />;
}

export function SampleIncidentPage({ isOperator }: { isOperator: boolean }) {
  const { view, submitAnswer } = useSampleIncident();
  return <IncidentScreen view={view} isOperator={isOperator} isSample submitAnswer={submitAnswer} />;
}
