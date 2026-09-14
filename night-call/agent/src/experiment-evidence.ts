type Loose = Record<string, unknown>;

const TRACE_EXCERPT_LIMIT = 1500;

function valueText(value: unknown, missing: string): string {
  return value === null || value === undefined || value === '' ? missing : String(value);
}

export function evidenceTextOf(reply: unknown): string {
  const evidence = (reply ?? {}) as Loose;
  const oomEvents = Array.isArray(evidence.oomEvents) ? String(evidence.oomEvents.length) : 'not reported';
  return [
    valueText(evidence.summary, 'No summary was recorded.'),
    `Traffic source: ${valueText(evidence.recipeSource, 'not reported')}`,
    `Requests sent: ${valueText(evidence.requestsSent, 'not reported')}`,
    `First failure at request: ${valueText(evidence.firstFailureAtRequest, 'none')}`,
    `Out-of-memory events: ${oomEvents}`,
    `Trace excerpt: ${valueText(evidence.traceExcerpt, 'none').slice(0, TRACE_EXCERPT_LIMIT)}`,
  ].join('\n');
}
