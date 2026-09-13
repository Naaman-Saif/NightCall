const BYTES_PER_MIB = 1024 * 1024;

export function bytesToMib(bytes: number): number {
  return Math.round((bytes / BYTES_PER_MIB) * 10) / 10;
}
