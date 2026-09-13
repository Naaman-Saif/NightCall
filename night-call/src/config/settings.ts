function setting(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const SANDBOX_PROJECT = 'nc-sandbox';

export const settings = Object.freeze({
  host: setting('NIGHT_CALL_HOST', '127.0.0.1'),
  port: Number(setting('NIGHT_CALL_PORT', '8000')),
  bedrockRegion: setting('NIGHT_CALL_BEDROCK_REGION', 'eu-central-1'),
  defaultModelId: setting('NIGHT_CALL_MODEL_ID', ''),
  triageModelId: setting('NIGHT_CALL_TRIAGE_MODEL_ID', setting('NIGHT_CALL_MODEL_ID', '')),
  remediatorModelId: setting('NIGHT_CALL_REMEDIATOR_MODEL_ID', setting('NIGHT_CALL_MODEL_ID', '')),
  reporterModelId: setting('NIGHT_CALL_REPORTER_MODEL_ID', setting('NIGHT_CALL_MODEL_ID', '')),
  productionProject: setting('NIGHT_CALL_PRODUCTION_PROJECT', 'prod'),
  sandboxProject: setting('NIGHT_CALL_SANDBOX_PROJECT', SANDBOX_PROJECT),
  flagdConfigPath: setting('NIGHT_CALL_FLAGD_CONFIG_PATH', ''),
  stateDir: setting('NIGHT_CALL_STATE_DIR', 'state'),
  astronomyShopPath: setting('NIGHT_CALL_ASTRONOMY_SHOP_PATH', ''),
  runsPath: setting('NIGHT_CALL_RUNS_PATH', '/root/code/nightcall-runs'),
  githubRepository: setting('NIGHT_CALL_GITHUB_REPOSITORY', 'Naaman-Saif/opentelemetry-demo'),
  demoBranch: setting('NIGHT_CALL_DEMO_BRANCH', 'nightcall-demo'),
  demoBaseSha: setting('NIGHT_CALL_DEMO_BASE_SHA', '2d1bc923654bcf6db415c4f1582952cdbf19f872'),
  grafanaBaseUrl: setting('NIGHT_CALL_GRAFANA_BASE_URL', 'http://127.0.0.1:8080/grafana'),
  jaegerBaseUrl: setting('NIGHT_CALL_JAEGER_BASE_URL', 'http://127.0.0.1:8080/jaeger/ui'),
  githubToken: setting('GITHUB_TOKEN', ''),
  toolToken: setting('NIGHT_CALL_TOOL_TOKEN', ''),
  toolTokenLead: setting('NIGHT_CALL_TOOL_TOKEN_LEAD', ''),
  toolTokenInvestigator: setting('NIGHT_CALL_TOOL_TOKEN_INVESTIGATOR', ''),
  toolTokenVerifier: setting('NIGHT_CALL_TOOL_TOKEN_VERIFIER', ''),
  operatorSecret: setting('NIGHT_CALL_OPERATOR_SECRET', ''),
  invokeAgentsOnAlert: setting('NIGHT_CALL_INVOKE_AGENTS_ON_ALERT', 'false') === 'true',
  sampleIncidentPath: setting('NIGHT_CALL_SAMPLE_INCIDENT_PATH', '/app/web/public/fixtures/sample-incident.json'),
  agentRuntimeArn: setting('NIGHT_CALL_AGENT_RUNTIME_ARN', ''),
});

const requiredSettings: Record<string, string> = {
  NIGHT_CALL_FLAGD_CONFIG_PATH: settings.flagdConfigPath,
  NIGHT_CALL_ASTRONOMY_SHOP_PATH: settings.astronomyShopPath,
  NIGHT_CALL_TOOL_TOKEN_LEAD: settings.toolTokenLead,
  NIGHT_CALL_TOOL_TOKEN_INVESTIGATOR: settings.toolTokenInvestigator,
  NIGHT_CALL_TOOL_TOKEN_VERIFIER: settings.toolTokenVerifier,
  NIGHT_CALL_OPERATOR_SECRET: settings.operatorSecret,
  NIGHT_CALL_AGENT_RUNTIME_ARN: settings.agentRuntimeArn,
  NIGHT_CALL_RUNS_PATH: settings.runsPath,
};

const projectsOpenToWrites = new Set<string>([SANDBOX_PROJECT]);

export function blankSettings(): string[] {
  return Object.keys(requiredSettings)
    .filter((name) => requiredSettings[name] === '')
    .sort();
}

export function projectAcceptsWrites(project: string): boolean {
  return projectsOpenToWrites.has(project);
}
