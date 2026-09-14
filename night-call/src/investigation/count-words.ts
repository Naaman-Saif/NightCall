export function countWords(count: number | string, noun: string): string {
  if (typeof count === 'string' && Number.isNaN(Number(count))) return `${noun}s ${count}`;
  return Number(count) === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}
