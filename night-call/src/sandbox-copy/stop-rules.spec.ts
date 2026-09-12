import type { Observation } from './observation';
import { observationWith, sampleWith } from './samples.fixture';
import { workloadShouldStop } from './stop-rules';

const before = observationWith({});

describe('stop rules', () => {
  it('keeps going on a healthy sample', () => {
    expect(workloadShouldStop({ sample: sampleWith({}), before }, true)).toBe(false);
  });

  it('stops on a non-200 response', () => {
    expect(workloadShouldStop({ sample: sampleWith({ status: 500 }), before }, true)).toBe(true);
    expect(workloadShouldStop({ sample: sampleWith({ status: null }), before }, true)).toBe(true);
  });

  it('stops when the restart count went up', () => {
    expect(workloadShouldStop({ sample: sampleWith({ observation: { restarts: 1 } }), before }, true)).toBe(true);
  });

  it('stops when the container was killed for memory', () => {
    const state = { Status: 'running', OOMKilled: true } as Observation['state'];
    expect(workloadShouldStop({ sample: sampleWith({ observation: { state } }), before }, true)).toBe(true);
  });

  it('never stops when stopping on failure is off', () => {
    expect(workloadShouldStop({ sample: sampleWith({ status: 500 }), before }, false)).toBe(false);
  });
});
