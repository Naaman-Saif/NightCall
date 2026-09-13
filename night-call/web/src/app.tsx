import { readRoute } from './routes';
import { TopBar } from './screens/top-bar';
import { IncidentListScreen } from './screens/incident-list-screen';
import { LiveIncidentPage, SampleIncidentPage } from './screens/incident-pages';

export function App() {
  const route = readRoute(window.location);
  return (
    <div className="app">
      <TopBar />
      {route.page === 'list' && <IncidentListScreen showSample={route.showSample} isOperator={route.isOperator} />}
      {route.page === 'incident' && route.isSample && <SampleIncidentPage isOperator={route.isOperator} />}
      {route.page === 'incident' && !route.isSample && (
        <LiveIncidentPage incidentId={route.incidentId} isOperator={route.isOperator} />
      )}
    </div>
  );
}
