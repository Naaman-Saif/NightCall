import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { settings } from '../config/settings';
import { outcomeOf, type EvidenceBundle } from './evidence-bundle';

export interface RunRecord {
  bundle: EvidenceBundle;
  outcome: string;
  issueUrl: string;
  finishedAt: string;
}

function runsDir(): string {
  const dir = join(settings.stateDir, 'runs');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function indexEntry(record: RunRecord) {
  const { incident } = record.bundle;
  return { id: incident.id, key: incident.key, alert: incident.alert, outcome: record.outcome, issueUrl: record.issueUrl, finishedAt: record.finishedAt };
}

export function rebuildRunIndex(): void {
  const dir = runsDir();
  const records = readdirSync(dir)
    .filter((name) => name.endsWith('.json') && name !== 'index.json')
    .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as RunRecord)
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  writeFileSync(join(dir, 'index.json'), JSON.stringify(records.map(indexEntry), null, 2));
}

export function writeRunRecord(bundle: EvidenceBundle, issueUrl: string): RunRecord {
  const record = { bundle, outcome: outcomeOf(bundle), issueUrl, finishedAt: new Date().toISOString() };
  writeFileSync(join(runsDir(), `${bundle.incident.id}.json`), JSON.stringify(record, null, 2));
  rebuildRunIndex();
  return record;
}
