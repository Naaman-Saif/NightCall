const OFF_LIMITS = /\b(proven|proved|investigation lead|the lead|investigator|verifier|agents?|llm|glm|kimi|qwen|deepseek|language model|featherless|strands)\b/i;

const LONG_DASH = /\s*\u2014\s*/g;

export function wordingProblem(texts: string[]): string | null {
  const offending = texts.map((text) => OFF_LIMITS.exec(text)?.[0]).find((word) => word !== undefined);
  if (offending === undefined) return null;
  return `rewrite without the word "${offending}": never claim proof, and write as NightCall's report without naming any role, agent or model`;
}

export function plainText(text: string): string {
  return text.replace(LONG_DASH, ', ').trim();
}
