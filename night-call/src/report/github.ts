import { settings } from '../config/settings';

export interface FiledIssue {
  url: string;
  number: number;
}

export async function fileIssue(title: string, body: string): Promise<FiledIssue> {
  const response = await fetch(`https://api.github.com/repos/${settings.githubRepository}/issues`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${settings.githubToken}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'night-call',
    },
    body: JSON.stringify({ title, body, labels: ['night-call'] }),
  });
  if (!response.ok) throw new Error(`github ${response.status}: ${await response.text()}`);
  const issue = (await response.json()) as { html_url: string; number: number };
  return { url: issue.html_url, number: issue.number };
}
