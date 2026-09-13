import { writeFileSync } from 'node:fs';

import { settings } from '../config/settings';
import { releaseCacheFlag, revertCacheFlag } from '../production/flag-release';
import { defaultVariantIn } from '../production/flag-text';

async function deployBadConfig(): Promise<void> {
  const reverting = process.argv.includes('--revert');
  const outcome = reverting ? await revertCacheFlag() : await releaseCacheFlag();
  writeFileSync(settings.flagdConfigPath, outcome.text);
  const localVariant = defaultVariantIn(outcome.text, 'recommendationCacheFailure');
  const action = reverting ? 'revert' : 'release';
  console.log(JSON.stringify({ action, sha: outcome.sha, branch: settings.demoBranch, localFile: settings.flagdConfigPath, localVariant }));
}

deployBadConfig().catch((error: unknown) => {
  console.error(`deploy-bad-config failed: ${String(error)}`);
  process.exitCode = 1;
});
