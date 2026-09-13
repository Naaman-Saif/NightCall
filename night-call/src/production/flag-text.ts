export type VariantChange = { flag: string; variant: string };

const DEFAULT_VARIANT = /("defaultVariant"\s*:\s*")([^"]*)(")/;

function flagStart(text: string, flag: string): number {
  return text.indexOf(`"${flag}"`);
}

export function defaultVariantIn(text: string, flag: string): string | null {
  const start = flagStart(text, flag);
  if (start === -1) return null;
  return DEFAULT_VARIANT.exec(text.slice(start))?.[2] ?? null;
}

export function withDefaultVariant(text: string, change: VariantChange): string {
  const start = flagStart(text, change.flag);
  if (start === -1) throw new Error(`flag ${change.flag} is not in the flag file`);
  const rest = text.slice(start).replace(DEFAULT_VARIANT, `$1${change.variant}$3`);
  return text.slice(0, start) + rest;
}
