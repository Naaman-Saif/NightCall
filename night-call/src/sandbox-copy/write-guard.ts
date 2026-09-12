import { sandboxProject } from './constants';

export function requireSandboxProject(project: string): void {
  if (project !== sandboxProject) throw new Error(`refusing to write to compose project ${project}`);
}
