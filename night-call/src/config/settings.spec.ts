import { projectAcceptsWrites, settings } from './settings';
import { actionIsKnown, actionRunsWithoutAHuman } from './vocabulary';

describe('settings', () => {
  it('opens only the sandbox project to writes', () => {
    expect(projectAcceptsWrites(settings.sandboxProject)).toBe(true);
    expect(projectAcceptsWrites(settings.productionProject)).toBe(false);
  });
});

describe('vocabulary', () => {
  it('knows the three actions and trials only two', () => {
    expect(actionIsKnown('set_flag')).toBe(true);
    expect(actionIsKnown('run_shell')).toBe(false);
    expect(actionRunsWithoutAHuman('revert_flag')).toBe(true);
    expect(actionRunsWithoutAHuman('set_flag')).toBe(false);
  });
});
