export function plainPayload<Payload extends object>(payload: Payload): Omit<Payload, 'illustrative'> {
  const entries = Object.entries(payload).filter(([key]) => key !== 'illustrative');
  return Object.fromEntries(entries) as Omit<Payload, 'illustrative'>;
}
