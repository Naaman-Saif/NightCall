import type { Snapshot } from './snapshot';

function countWord(count: number, noun: string): string {
  return count === 1 ? `one ${noun}` : `${count} ${noun}s`;
}

export function activitySentence(snapshot: Snapshot): string {
  const ending = snapshot.investigationStop?.reason === 'error' ? 'stopped after a failure' : 'stopped';
  const signals = Object.keys(snapshot.evidence).length;
  const questions = snapshot.questions.length;
  const read = signals > 0 ? [`read ${countWord(signals, 'signal')}`] : [];
  const asked = questions > 0 ? [`asked ${countWord(questions, 'question')}`] : [];
  const parts = [...read, ...asked];
  if (parts.length === 0) return `NightCall ${ending} before reading any signals.`;
  if (parts.length === 1) return `NightCall ${parts[0]} and ${ending}.`;
  return `NightCall ${parts.join(', ')}, and ${ending}.`;
}
