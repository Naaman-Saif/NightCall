import { JAEGER_PAGE_LIMIT, MAX_TRACE_WINDOW_MS, tracesInPages, type TraceWindow } from './jaeger-pages';
import type { JaegerTrace } from './jaeger-types';

function tracesStartingAt(fromMs: number, count: number): JaegerTrace[] {
  return Array.from({ length: count }, (_, index) => {
    const startMs = fromMs + index;
    const span = { traceID: `t${startMs}`, spanID: 's', operationName: 'op', startTime: startMs * 1000, duration: 1000, processID: 'p1', tags: [] };
    return { traceID: `t${startMs}`, spans: [span], processes: { p1: { serviceName: 'frontend' } } };
  });
}

describe('jaeger pages', () => {
  it('reads in bounded pages of at most 500 traces, moving the window end back each time', async () => {
    const toMs = 10_000_000;
    const windows: TraceWindow[] = [];
    const pages = [tracesStartingAt(toMs - 500, 500), tracesStartingAt(toMs - 1000, 500), tracesStartingAt(toMs - 1100, 40)];
    const fetchPage = async (window: TraceWindow) => {
      windows.push(window);
      return pages[windows.length - 1] ?? [];
    };
    const traces = await tracesInPages(fetchPage, { fromMs: 0, toMs });
    expect(windows).toEqual([
      { fromMs: toMs - MAX_TRACE_WINDOW_MS, toMs },
      { fromMs: toMs - MAX_TRACE_WINDOW_MS, toMs: toMs - 500 },
      { fromMs: toMs - MAX_TRACE_WINDOW_MS, toMs: toMs - 1000 },
    ]);
    expect(traces).toHaveLength(1040);
    expect(JAEGER_PAGE_LIMIT).toBe(500);
  });

  it('stops when a full page cannot move the window end back', async () => {
    let calls = 0;
    const samePage = tracesStartingAt(5000, 1).flatMap((trace) => Array.from({ length: JAEGER_PAGE_LIMIT }, (_, index) => ({ ...trace, traceID: `same${index}` })));
    const fetchPage = async () => {
      calls += 1;
      return samePage;
    };
    const traces = await tracesInPages(fetchPage, { fromMs: 0, toMs: 5000 });
    expect(calls).toBe(1);
    expect(traces).toHaveLength(JAEGER_PAGE_LIMIT);
  });
});
