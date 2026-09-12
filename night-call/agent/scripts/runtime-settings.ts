const DEFAULTS: Record<string, string> = {
  FEATHERLESS_BASE_URL: 'https://api.featherless.ai/v1',
  NIGHT_CALL_LEAD_MODEL: 'featherless:zai-org/GLM-5.3',
  NIGHT_CALL_INVESTIGATOR_MODEL: 'featherless:zai-org/GLM-5.3',
  NIGHT_CALL_VERIFIER_MODEL: 'featherless:moonshotai/Kimi-K3',
};

const REQUIRED = ['TOOL_API_URL', 'NIGHT_CALL_TOOL_TOKEN', 'FEATHERLESS_API_KEY'];
const SECRET = new Set(['NIGHT_CALL_TOOL_TOKEN', 'FEATHERLESS_API_KEY']);

export function runtimeEnvironment(): Record<string, string> {
  const missing = REQUIRED.filter((name) => (process.env[name] ?? '') === '');
  if (missing.length > 0) throw new Error(`missing deploy settings: ${missing.join(', ')}`);
  const names = [...REQUIRED, ...Object.keys(DEFAULTS)];
  return Object.fromEntries(names.map((name) => [name, process.env[name] || DEFAULTS[name]]));
}

export function maskedEnvironment(environment: Record<string, string>): Record<string, string> {
  const entries = Object.entries(environment);
  return Object.fromEntries(entries.map(([name, value]) => [name, SECRET.has(name) ? '***' : value]));
}

export function runtimeShape(imageUri: string, roleArn: string) {
  return {
    agentRuntimeArtifact: { containerConfiguration: { containerUri: imageUri } },
    roleArn,
    networkConfiguration: { networkMode: 'PUBLIC' as const },
    protocolConfiguration: { serverProtocol: 'HTTP' as const },
    lifecycleConfiguration: { idleRuntimeSessionTimeout: 1200, maxLifetime: 3600 },
    environmentVariables: runtimeEnvironment(),
  };
}
