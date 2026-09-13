import { settings } from '../config/settings';
import { FLAG_FILE } from './flag-release';
import { githubJson, repositoryPath } from './github-client';
import { excerptFromStart, type Reading } from './reading';

export type CommitDetail = {
  sha: string;
  html_url: string;
  commit: { message: string; committer: { date: string }; author: { name: string } };
  files?: { filename: string; patch?: string }[];
};

export type DeployChange = { sha: string; committedAt: string; message: string; author: string; url: string; patch: string };

const HISTORY_LENGTH = 5;
const PATCH_CHARACTERS = 1500;

export function deployChangeOf(detail: CommitDetail): DeployChange {
  const patch = (detail.files?.find((file) => file.filename === FLAG_FILE)?.patch ?? '').slice(0, PATCH_CHARACTERS);
  const message = detail.commit.message.split('\n')[0];
  return { sha: detail.sha, committedAt: detail.commit.committer.date, message, author: detail.commit.author.name, url: detail.html_url, patch };
}

export function deployHistoryReading(changes: DeployChange[]): Reading {
  const latest = changes[0];
  const place = `${settings.githubRepository}@${settings.demoBranch}`;
  const summary = latest ? `Flag file changed in ${latest.sha.slice(0, 7)}: ${latest.message}` : `No changes to ${FLAG_FILE} on ${place}`;
  const lines = changes.flatMap((change) => [`${change.sha.slice(0, 7)} ${change.committedAt} ${change.author}: ${change.message}`, change.patch]);
  const sourceLinks = changes.map((change) => ({ label: `GitHub: commit ${change.sha.slice(0, 7)}`, url: change.url }));
  const source = `github: ${place} ${FLAG_FILE}`;
  return { kind: 'deploy_history', source, summary, excerpt: excerptFromStart(lines), observedAt: latest?.committedAt, sourceLinks, data: { changes } };
}

export async function readDeployHistory(): Promise<Reading> {
  const listPath = `/commits?sha=${settings.demoBranch}&path=${encodeURIComponent(FLAG_FILE)}&per_page=${HISTORY_LENGTH}`;
  const commits = await githubJson<{ sha: string }[]>({ path: repositoryPath(listPath) });
  const details = await Promise.all(commits.map((commit) => githubJson<CommitDetail>({ path: repositoryPath(`/commits/${commit.sha}`) })));
  return deployHistoryReading(details.map(deployChangeOf));
}
