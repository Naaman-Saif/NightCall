import type { LiveRequest } from '../api/live-run';
import { isFailedRequest } from '../format/live-run-text';
import { formatTimeOfDay } from '../format/time';

const REQUESTS_SHOWN = 12;

function newestFirst(requests: LiveRequest[]): LiveRequest[] {
  return [...requests].sort((first, second) => Date.parse(second.at) - Date.parse(first.at)).slice(0, REQUESTS_SHOWN);
}

export function LiveRequestFeed({ requests }: { requests: LiveRequest[] }) {
  if (requests.length === 0) return null;
  return (
    <ol className="live-feed" aria-label="Latest requests, newest first">
      {newestFirst(requests).map((request, index) => (
        <li key={`${index}-${request.at}`} data-failed={isFailedRequest(request.status)}>
          <span>{formatTimeOfDay(request.at)}</span>
          <span className="live-feed-route">{request.route}</span>
          <span>{request.productId ?? '-'}</span>
          <span className="live-feed-status">{request.status === 0 ? 'no reply' : request.status}</span>
          <span>{request.ms === null ? '-' : `${Math.round(request.ms)} ms`}</span>
        </li>
      ))}
    </ol>
  );
}
