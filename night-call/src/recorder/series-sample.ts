import type { ContainerStats } from 'dockerode';

export type SeriesSample = {
  at: string;
  service: string;
  memoryBytes: number | null;
  limitBytes: number | null;
  cpuPercent: number | null;
};

export type ProductionEvent = {
  id: string;
  at: string;
  service: string;
  container: string;
  action: string;
  exitCode: string | null;
};

export type ProductionContainer = { id: string; name: string; service: string };

export type ContainerReading = { stats: ContainerStats; limitBytes: number | null };

export interface ProductionSource {
  containers(): Promise<ProductionContainer[]>;
  read(container: ProductionContainer): Promise<ContainerReading>;
}
