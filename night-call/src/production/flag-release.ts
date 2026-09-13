import { settings } from '../config/settings';
import { defaultVariantIn, withDefaultVariant } from './flag-text';
import { githubJson, repositoryPath } from './github-client';

export const FLAG_FILE = 'src/flagd/demo.flagd.json';
export const CACHE_FLAG = 'recommendationCacheFailure';
export const RELEASE_MESSAGE = 'release: enable recommendation cache';

export type FlagOutcome = { sha: string; text: string };

type ContentFile = { sha: string; content: string };
type ContentWrite = { commit: { sha: string } };

export async function flagFileAt(ref: string): Promise<{ sha: string; text: string }> {
  const file = await githubJson<ContentFile>({ path: repositoryPath(`/contents/${FLAG_FILE}?ref=${ref}`) });
  return { sha: file.sha, text: Buffer.from(file.content, 'base64').toString('utf8') };
}

export async function releaseCacheFlag(): Promise<FlagOutcome> {
  const file = await flagFileAt(settings.demoBranch);
  if (defaultVariantIn(file.text, CACHE_FLAG) === 'on') throw new Error(`${CACHE_FLAG} is already on in ${settings.demoBranch}, run --revert first`);
  const text = withDefaultVariant(file.text, { flag: CACHE_FLAG, variant: 'on' });
  const content = Buffer.from(text).toString('base64');
  const body = { message: RELEASE_MESSAGE, content, sha: file.sha, branch: settings.demoBranch };
  const written = await githubJson<ContentWrite>({ path: repositoryPath(`/contents/${FLAG_FILE}`), method: 'PUT', body });
  return { sha: written.commit.sha, text };
}

export async function revertCacheFlag(): Promise<FlagOutcome> {
  const body = { sha: settings.demoBaseSha, force: true };
  await githubJson({ path: repositoryPath(`/git/refs/heads/${settings.demoBranch}`), method: 'PATCH', body });
  const file = await flagFileAt(settings.demoBaseSha);
  return { sha: settings.demoBaseSha, text: withDefaultVariant(file.text, { flag: CACHE_FLAG, variant: 'off' }) };
}
