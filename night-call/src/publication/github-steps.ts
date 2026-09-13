import { settings } from '../config/settings';
import type { GithubCall } from '../production/github-client';
import { FLAG_FILE } from '../production/flag-release';
import { repositoryPath } from '../production/github-client';

export type Github = <Result>(call: GithubCall) => Promise<Result>;
export type PullRequest = { number: number; url: string };
export type FileWrite = { branch: string; text: string; message: string };
export type PullOpen = { branch: string; title: string; body: string };

type Ref = { object: { sha: string } };
type Content = { sha: string; content: string };
type Pull = { number: number; html_url: string };

function alreadyExists(error: unknown): boolean {
  return String(error).includes('answered 422');
}

export async function fileOnBranch(github: Github, branch: string): Promise<Content & { text: string }> {
  const file = await github<Content>({ path: repositoryPath(`/contents/${FLAG_FILE}?ref=${encodeURIComponent(branch)}`) });
  return { ...file, text: Buffer.from(file.content, 'base64').toString('utf8') };
}

export async function ensureBranch(github: Github, branch: string): Promise<void> {
  const base = await github<Ref>({ path: repositoryPath(`/git/ref/heads/${settings.demoBranch}`) });
  const body = { ref: `refs/heads/${branch}`, sha: base.object.sha };
  await github({ path: repositoryPath('/git/refs'), method: 'POST', body }).catch((error: unknown) => {
    if (!alreadyExists(error)) throw error;
  });
}

export async function writeFlagFile(github: Github, write: FileWrite): Promise<void> {
  const current = await fileOnBranch(github, write.branch);
  if (current.text === write.text) return;
  const body = { message: write.message, content: Buffer.from(write.text).toString('base64'), sha: current.sha, branch: write.branch };
  await github({ path: repositoryPath(`/contents/${FLAG_FILE}`), method: 'PUT', body });
}

export async function findOpenPull(github: Github, branch: string): Promise<PullRequest | null> {
  const owner = settings.githubRepository.split('/')[0];
  const pulls = await github<Pull[]>({ path: repositoryPath(`/pulls?state=open&head=${owner}:${encodeURIComponent(branch)}`) });
  const pull = Array.isArray(pulls) ? pulls[0] : undefined;
  return pull ? { number: pull.number, url: pull.html_url } : null;
}

async function existingPull(github: Github, branch: string): Promise<PullRequest> {
  const pull = await findOpenPull(github, branch);
  if (!pull) throw new Error(`no open pull request found for ${branch}`);
  return pull;
}

export async function openPull(github: Github, open: PullOpen): Promise<PullRequest> {
  const body = { title: open.title, head: open.branch, base: settings.demoBranch, body: open.body };
  try {
    const pull = await github<Pull>({ path: repositoryPath('/pulls'), method: 'POST', body });
    return { number: pull.number, url: pull.html_url };
  } catch (error) {
    if (!alreadyExists(error)) throw error;
    return existingPull(github, open.branch);
  }
}
