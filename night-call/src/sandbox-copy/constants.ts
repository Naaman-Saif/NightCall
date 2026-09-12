export const runsPath = process.env.NIGHT_CALL_RUNS_PATH ?? '/root/code/nightcall-runs';
export const shopPath = process.env.NIGHT_CALL_ASTRONOMY_SHOP_PATH ?? '/root/code/astronomy-shop';
export const sandboxProject = 'nc-sandbox';
export const sandboxNetwork = 'nc-sandbox-network';
export const productionProject = 'prod';
export const budgetMs = 30 * 60 * 1000;
export const cleanupMarkerPath = `${runsPath}/nc-sandbox-cleanup-failed.json`;

export const productionComposeFiles = [
  'compose.yaml',
  'compose.full.yaml',
  'compose.observability.yaml',
  'compose.box-override.yaml',
];

export const excludedServices = new Set([
  'frontend-proxy',
  'load-generator',
  'flagd-ui',
  'grafana',
  'telemetry-docs',
  'opensearch',
]);

export const evidenceServices = ['recommendation', 'frontend', 'product-catalog', 'flagd', 'otel-collector'];
export const snapshotServices = [...evidenceServices, 'jaeger'];

export const flagFileInShop = 'src/flagd/demo.flagd.json';
export const cacheFlag = 'recommendationCacheFailure';
export const recommendationSource = '/app/recommendation_server.py';
export const collectorConfigTarget = '/etc/sandbox-collector.yml';

export function sandboxContainerName(service: string): string {
  return `${sandboxProject}-${service}`;
}
