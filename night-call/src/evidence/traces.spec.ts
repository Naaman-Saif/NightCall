import { summarizeErrorSpans } from './traces';

describe('error span summary', () => {
  it('keeps only spans marked as errors and pulls the message out', () => {
    const traces = [
      {
        traceID: 'abc',
        spans: [
          { operationName: 'oteldemo.PaymentService/Charge', duration: 12000, tags: [{ key: 'error', value: true }, { key: 'otel.status_description', value: 'PaymentService Fail Feature Flag Enabled' }], logs: [] },
          { operationName: 'GET /', duration: 3000, tags: [], logs: [] },
        ],
      },
    ];
    expect(summarizeErrorSpans(traces)).toEqual([
      { traceId: 'abc', operation: 'oteldemo.PaymentService/Charge', durationMs: 12, message: 'PaymentService Fail Feature Flag Enabled' },
    ]);
  });
});
