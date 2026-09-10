function setting(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const settings = Object.freeze({
  host: setting('NIGHT_CALL_HOST', '127.0.0.1'),
  port: Number(setting('NIGHT_CALL_PORT', '8000')),
  bedrockRegion: setting('NIGHT_CALL_BEDROCK_REGION', 'eu-central-1'),
  defaultModelId: setting('NIGHT_CALL_MODEL_ID', ''),
  triageModelId: setting('NIGHT_CALL_TRIAGE_MODEL_ID', setting('NIGHT_CALL_MODEL_ID', '')),
  remediatorModelId: setting('NIGHT_CALL_REMEDIATOR_MODEL_ID', setting('NIGHT_CALL_MODEL_ID', '')),
  reporterModelId: setting('NIGHT_CALL_REPORTER_MODEL_ID', setting('NIGHT_CALL_MODEL_ID', '')),
  productionProject: setting('NIGHT_CALL_PRODUCTION_PROJECT', 'prod'),
  sandboxProject: setting('NIGHT_CALL_SANDBOX_PROJECT', 'clone'),
  flagdConfigPath: setting('NIGHT_CALL_FLAGD_CONFIG_PATH', ''),
  stateDir: setting('NIGHT_CALL_STATE_DIR', 'state'),
  astronomyShopPath: setting('NIGHT_CALL_ASTRONOMY_SHOP_PATH', ''),
  githubRepository: setting('NIGHT_CALL_GITHUB_REPOSITORY', ''),
  githubToken: setting('GITHUB_TOKEN', ''),
});

const requiredSettings: Record<string, string> = {
  NIGHT_CALL_MODEL_ID: settings.defaultModelId,
  NIGHT_CALL_FLAGD_CONFIG_PATH: settings.flagdConfigPath,
  NIGHT_CALL_ASTRONOMY_SHOP_PATH: settings.astronomyShopPath,
  NIGHT_CALL_GITHUB_REPOSITORY: settings.githubRepository,
  GITHUB_TOKEN: settings.githubToken,
};

const projectsOpenToWrites = new Set<string>([settings.sandboxProject]);

export function blankSettings(): string[] {
  return Object.keys(requiredSettings)
    .filter((name) => requiredSettings[name] === '')
    .sort();
}

export function projectAcceptsWrites(project: string): boolean {
  return projectsOpenToWrites.has(project);
}
