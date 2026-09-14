import { Goose } from './goose';

export function IncidentWelcome() {
  return (
    <div className="incident-welcome">
      <div className="incident-welcome-copy">
        <h1 className="page-title">Incidents</h1>
        <p className="muted">NightCall opens an incident when monitoring fires and investigates for up to 30 minutes.</p>
      </div>
      <Goose size="large" />
    </div>
  );
}
