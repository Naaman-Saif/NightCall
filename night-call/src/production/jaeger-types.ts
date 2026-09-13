export type JaegerTag = { key: string; value: unknown };

export type JaegerSpan = {
  traceID: string;
  spanID: string;
  operationName: string;
  startTime: number;
  duration: number;
  processID: string;
  tags: JaegerTag[];
};

export type JaegerTrace = { traceID: string; spans: JaegerSpan[]; processes: Record<string, { serviceName: string }> };
