import type { IncidentEvent, Snapshot } from '../api/contract';
import { reducerFrom } from './reducer-table';

function changePublication(snapshot: Snapshot, event: IncidentEvent<'publication_changed'>): Snapshot {
  const { state, repository, baseBranch, number, url, diff, failureReason } = event.payload;
  const isPublishingAttempt = state !== 'failed';
  if (isPublishingAttempt && snapshot.mitigation?.status !== 'verified') return snapshot;
  return { ...snapshot, publication: { state, repository, baseBranch, number, url, diff, failureReason } };
}

export const reducePublication = reducerFrom({ publication_changed: changePublication });
