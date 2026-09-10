import { failed, reading, signatureIsGreen, signatureOf, signaturesMatch } from './reading';

describe('failure signature', () => {
  it('keeps only failing probes, sorted by name', () => {
    const signature = signatureOf([reading('frontend_http_status', 200), failed('payment_error_rate', 0.83), failed('checkout_http_status', 422)]);
    expect(signature).toEqual({ checkout_http_status: 422, payment_error_rate: 0.83 });
    expect(signatureIsGreen(signature)).toBe(false);
  });

  it('matches on which probes fail, not on their exact values', () => {
    const production = { checkout_http_status: 422, payment_error_rate: 0.79 };
    const clone = { checkout_http_status: 422, payment_error_rate: 0.83 };
    expect(signaturesMatch(production, clone)).toBe(true);
    expect(signaturesMatch(production, { checkout_http_status: 422 })).toBe(false);
  });

  it('calls an empty signature green', () => {
    expect(signatureIsGreen(signatureOf([reading('frontend_http_status', 200)]))).toBe(true);
  });
});
