import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { Incident, IncidentStatus } from './incident';

export class IncidentStore {
  constructor(private readonly path: string) {}

  all(): Incident[] {
    try {
      return JSON.parse(readFileSync(this.path, 'utf8')) as Incident[];
    } catch {
      return [];
    }
  }

  add(incident: Incident): void {
    this.replaceAll([...this.all(), incident]);
  }

  setStatus(id: string, status: IncidentStatus): void {
    const updated = this.all().map((incident) => (incident.id === id ? { ...incident, status } : incident));
    this.replaceAll(updated);
  }

  private replaceAll(incidents: Incident[]): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tempPath = `${this.path}.tmp`;
    writeFileSync(tempPath, JSON.stringify(incidents, null, 2));
    renameSync(tempPath, this.path);
  }
}
