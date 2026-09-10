export const actionVocabulary = ['revert_flag', 'restart_service', 'set_flag'] as const;

export type ActionName = (typeof actionVocabulary)[number];

const actionsSafeToTrial = new Set<string>(['revert_flag', 'restart_service']);

export function actionIsKnown(name: string): boolean {
  return (actionVocabulary as readonly string[]).includes(name);
}

export function actionRunsWithoutAHuman(name: string): boolean {
  return actionsSafeToTrial.has(name);
}
