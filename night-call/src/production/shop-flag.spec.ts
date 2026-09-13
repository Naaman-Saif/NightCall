import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { setShopFlag } from './shop-flag';

const flagFile = `{
  "flags": {
    "recommendationCacheFailure": {
      "state": "ENABLED",
      "variants": { "on": true, "off": false },
      "defaultVariant": "off"
    }
  }
}
`;

function flagFilePath(): string {
  const path = join(mkdtempSync(join(tmpdir(), 'shop-flag-')), 'demo.flagd.json');
  writeFileSync(path, flagFile);
  return path;
}

describe('shop flag switch', () => {
  it('switches the recommendation flag in place and reports before and after', () => {
    const path = flagFilePath();
    const inode = statSync(path).ino;
    expect(setShopFlag(['on'], path)).toEqual({ flag: 'recommendationCacheFailure', before: 'off', after: 'on' });
    expect(statSync(path).ino).toBe(inode);
    expect(setShopFlag(['off', 'recommendationCacheFailure'], path)).toMatchObject({ before: 'on', after: 'off' });
    expect(readFileSync(path, 'utf8')).toBe(flagFile);
  });

  it('refuses other flags and values without touching the file', () => {
    const path = flagFilePath();
    expect(() => setShopFlag(['on', 'paymentFailure'], path)).toThrow('only recommendationCacheFailure');
    expect(() => setShopFlag(['maybe'], path)).toThrow('usage');
    expect(() => setShopFlag([], path)).toThrow('usage');
    expect(readFileSync(path, 'utf8')).toBe(flagFile);
  });
});
