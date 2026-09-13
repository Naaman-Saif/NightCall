import type { Brief } from './evidence-ledger.js';
import { capitalized, failureStatement, type ImpactReadings } from './impact-facts.js';

const FAILURE_WORDS = /\b(fail|fails|failing|failed|failure|failures|errors?|erroring)\b/i;
const REQUEST_WORDS = /\b(requests?|calls?|recommendations?)\b/i;
const NEGATION = /\b(not|no|zero|without)\b|\b0(\.0+)?%/i;
const SENTENCE_BREAK = /(?<=[.!?])\s+/;

export function claimsFailingRequests(sentence: string): boolean {
  return FAILURE_WORDS.test(sentence) && REQUEST_WORDS.test(sentence) && !NEGATION.test(sentence);
}

function failuresMeasured(impact: ImpactReadings | null): boolean {
  return (impact?.failure?.errorShare ?? 0) > 0;
}

export function honestText(text: string, impact: ImpactReadings | null): string {
  if (failuresMeasured(impact)) return text;
  const measured = `${capitalized(failureStatement(impact?.failure ?? null))}.`;
  const sentences = text.split(SENTENCE_BREAK).map((sentence) => (claimsFailingRequests(sentence) ? measured : sentence));
  return sentences.filter((sentence, index) => sentence !== measured || sentences.indexOf(measured) === index).join(' ');
}

export function honestBrief(brief: Brief, impact: ImpactReadings | null): Brief {
  const fix = (text: string) => honestText(text, impact);
  const knownFacts = brief.knownFacts.map((fact) => ({ ...fact, text: fix(fact.text) }));
  return { ...brief, summary: fix(brief.summary), knownFacts, nextStep: fix(brief.nextStep) };
}
