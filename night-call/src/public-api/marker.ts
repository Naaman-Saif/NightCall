export const MARKER_KINDS = [
  'config_change',
  'crash',
  'restart',
  'alarm',
  'operator_answer',
  'fix_verified',
  'pr_opened',
] as const;

export type MarkerKind = (typeof MARKER_KINDS)[number];

export type Marker = { at: string; kind: MarkerKind; label: string; ref: string | null };

const LABEL_LIMIT = 120;

function shortLabel(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  return singleLine.length <= LABEL_LIMIT ? singleLine : `${singleLine.slice(0, LABEL_LIMIT - 3)}...`;
}

export function marker(input: Marker): Marker {
  return { ...input, label: shortLabel(input.label) };
}
