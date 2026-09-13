export const BUDGET_USED = 'tool budget used, give your final answer';

export type ToolBudget = { used: number; limit: number };

export function budgetOf(limit: number): ToolBudget {
  return { used: 0, limit };
}

export function withBudget<Input>(budget: ToolBudget, callback: (input: Input) => Promise<string>) {
  return async (input: Input): Promise<string> => {
    if (budget.used >= budget.limit) return BUDGET_USED;
    budget.used += 1;
    return callback(input);
  };
}
