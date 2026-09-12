export interface RequestIdentity {
  sessionId: string;
  traceId: string;
}

export interface RequestTarget {
  endpoint: string;
  identity: RequestIdentity;
}

export interface RequestResult {
  status: number | null;
  products?: number;
  bytes?: number;
  duration_ms?: number;
  error?: string;
}

const requestTimeoutMs = 5000;

function productCount(body: string): number {
  try {
    const products: unknown = JSON.parse(body);
    return Array.isArray(products) ? products.length : 0;
  } catch {
    return 0;
  }
}

function recommendationsUrl(target: RequestTarget): string {
  const query = new URLSearchParams({ productIds: 'OLJCESPC7Z', currencyCode: 'USD', sessionId: target.identity.sessionId });
  return `${target.endpoint}/api/recommendations?${query.toString()}`;
}

export async function requestRecommendations(target: RequestTarget): Promise<RequestResult> {
  const { traceId } = target.identity;
  const headers = { traceparent: `00-${traceId}-${traceId.slice(0, 16)}-01` };
  const started = Date.now();
  try {
    const response = await fetch(recommendationsUrl(target), { headers, signal: AbortSignal.timeout(requestTimeoutMs) });
    const body = await response.text();
    if (response.status >= 400) return { status: response.status, error: body.slice(0, 1024) };
    const durationMs = Date.now() - started;
    return { status: response.status, products: productCount(body), bytes: Buffer.byteLength(body), duration_ms: durationMs };
  } catch (error) {
    return { status: null, error: String(error), duration_ms: Date.now() - started };
  }
}
