import type { Publication } from '../api/contract';
import { Icon } from '../kit';

export function PullRequestLink({ publication }: { publication: Publication }) {
  const isOpened = publication.state === 'published' && Boolean(publication.url);
  if (!isOpened || !publication.url) return null;
  const label = publication.number === null ? 'Open the pull request on GitHub' : `Open PR #${publication.number} on GitHub`;
  return (
    <a className="pr-link" href={publication.url} target="_blank" rel="noreferrer" data-pull-request={publication.number ?? ''}>
      <Icon name="git-branch" size={14} />
      {label}
      <Icon name="external-link" size={12} />
    </a>
  );
}
