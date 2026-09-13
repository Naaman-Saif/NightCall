import { useState } from 'react';
import { Button, Card, Select } from '../kit';
import { operatorIncidentPath, useServices, useStartInvestigation, type StartState } from './use-start-investigation';

export function StartInvestigation() {
  const { services, loadFailed } = useServices();
  const [pickedService, setPickedService] = useState('');
  const { state, start } = useStartInvestigation();
  const service = pickedService || services?.[0] || '';
  const isStarting = state.status === 'starting';
  return (
    <Card title="Start investigation" className="start-investigation">
      {loadFailed && <p className="start-note" data-tone="failed">The service list could not be loaded. Try again in a moment.</p>}
      <div className="start-controls">
        <Select label="Service" options={services ?? []} value={service} disabled={!services || isStarting}
          onChange={(event) => setPickedService(event.target.value)} wrapperStyle={{ flex: 1, minWidth: 0 }} />
        <Button variant="primary" icon="play" loading={isStarting} disabled={!service || isStarting} onClick={() => start(service)}>
          Start investigation
        </Button>
      </div>
      <StartStatus state={state} />
    </Card>
  );
}

function StartStatus({ state }: { state: StartState }) {
  if (state.status === 'starting') return <p className="start-note" role="status">Starting the investigation.</p>;
  if (state.status === 'failed') {
    return <p className="start-note" role="alert" data-tone="failed">The investigation could not be started. Nothing is running. Try again.</p>;
  }
  if (state.status !== 'already_running') return null;
  return (
    <p className="start-note" role="alert">
      An investigation is already running for this service.{' '}
      <a href={state.incidentId ? operatorIncidentPath(state.incidentId) : '/op/incidents'}>Open it</a>
    </p>
  );
}
