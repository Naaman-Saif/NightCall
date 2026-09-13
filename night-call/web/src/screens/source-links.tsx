import type { Evidence, SourceLink } from '../api/contract';

const SEPARATE_MEASUREMENT = /separate measurement/i;

function isWebLink(link: SourceLink): boolean {
  return /^https?:\/\//i.test(link.url);
}

export function SourceLinks({ links }: { links?: SourceLink[] }) {
  const webLinks = (links ?? []).filter(isWebLink);
  if (webLinks.length === 0) return null;
  return (
    <span className="source-links">
      {webLinks.map((link, index) => (
        <a key={`${index}-${link.url}`} className="source-link" href={link.url} target="_blank" rel="noreferrer"
          data-rank={SEPARATE_MEASUREMENT.test(link.label) ? 'secondary' : 'primary'}>
          {link.label}
        </a>
      ))}
    </span>
  );
}

export function EvidenceLine({ evidence, fallback }: { evidence: Evidence | undefined; fallback: string }) {
  return (
    <span className="evidence-line">
      {evidence?.summary ?? fallback}
      <SourceLinks links={evidence?.sourceLinks} />
    </span>
  );
}
