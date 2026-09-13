import { ForbiddenException } from '@nestjs/common';
import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readSnapshot } from '../investigation/incident-catalog';
import { freshWriter, openIncident } from '../investigation/writer.fixture';
import { FlagStateController } from '../tool-api/flag-state.controller';
import type { ToolRequest } from '../tool-api/role.guard';
import { EXCERPT_LINK_LABEL } from './exact-source';
import { githubJson } from './github-client';
import { readFlagState } from './read-flag-state';
import { recordReading } from './record-reading';

jest.mock('./github-client', () => ({ githubJson: jest.fn(), repositoryPath: (suffix: string) => suffix }));

function flagFile(variant: string): string {
  return `{\n  "flags": {\n    "recommendationCacheFailure": {\n      "defaultVariant": "${variant}"\n    }\n  }\n}\n`;
}

function liveFile(variant: string): string {
  const path = join(mkdtempSync(join(tmpdir(), 'flag-state-')), 'demo.flagd.json');
  writeFileSync(path, flagFile(variant));
  const changedAt = new Date('2026-09-13T17:54:10.000Z');
  utimesSync(path, changedAt, changedAt);
  return path;
}

function branchHolds(variant: string): void {
  jest.mocked(githubJson).mockResolvedValueOnce({ sha: 's', content: Buffer.from(flagFile(variant)).toString('base64') });
}

const query = (flagFilePath: string) => ({ flagFilePath, branch: 'nightcall-demo' });

describe('flag state reader', () => {
  it('reports a flag switched on by hand and not committed, with the stored reading as its exact source', async () => {
    branchHolds('off');
    const reading = await readFlagState(query(liveFile('on')));
    expect(reading.summary).toBe('recommendationCacheFailure is on in the live flag file, changed at 17:54 UTC, not committed to nightcall-demo');
    expect(reading).toMatchObject({ kind: 'flag_state', observedAt: '2026-09-13T17:54:10.000Z', value: 'on, changed 17:54 UTC' });
    const writer = freshWriter();
    const incidentId = await openIncident(writer);
    const { evidence } = await recordReading(writer, { incidentId, reading });
    const evidenceId = String(evidence.payload.evidenceId);
    expect((evidence.payload.sourceLinks as { label: string; url: string }[])[0]).toEqual({
      label: EXCERPT_LINK_LABEL,
      url: `/api/incidents/${incidentId}/evidence/${evidenceId}`,
    });
    expect(readSnapshot(writer.stateDir, incidentId)?.runReport.did.at(-1)?.text).toBe('Read flag state');
  });

  it('says when the live file matches the branch and when the branch cannot be read', async () => {
    branchHolds('on');
    expect((await readFlagState(query(liveFile('on')))).summary).toMatch(/, matches nightcall-demo$/);
    jest.mocked(githubJson).mockRejectedValueOnce(new Error('github answered 503'));
    const unknown = await readFlagState(query(liveFile('off')));
    expect(unknown.summary).toMatch(/is off in the live flag file, changed at 17:54 UTC, could not be compared with nightcall-demo$/);
    expect(unknown.data).toMatchObject({ comparisonError: 'Error: github answered 503' });
  });

  it('lets only the lead and the investigator read the flag state', async () => {
    const controller = new FlagStateController(freshWriter());
    const request = { params: { id: 'inc-001' }, toolRole: 'verifier' } as unknown as ToolRequest;
    await expect(controller.flagState(request)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
