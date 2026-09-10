import { randomUUID } from 'node:crypto';

import { urlFor } from '../config/hosts';
import type { StackTarget } from '../config/targets';
import { failed, reading, type ProbeReading } from './reading';

const checkoutPerson = {
  email: 'night-call@example.com',
  address: { streetAddress: '1600 Amphitheatre Parkway', zipCode: '94043', city: 'Mountain View', state: 'CA', country: 'United States' },
  userCurrency: 'USD',
  creditCard: { creditCardNumber: '4432-8015-6152-0454', creditCardExpirationMonth: 1, creditCardExpirationYear: 2039, creditCardCvv: 672 },
};

async function postJson(url: string, body: unknown): Promise<number> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return response.status;
}

function statusReading(name: string, status: number): ProbeReading {
  return status === 200 ? reading(name, status) : failed(name, status);
}

export async function frontendProbe(target: StackTarget): Promise<ProbeReading> {
  const response = await fetch(`${await urlFor(target, 'frontend-proxy')}/`);
  return statusReading('frontend_http_status', response.status);
}

export async function checkoutProbe(target: StackTarget): Promise<ProbeReading> {
  const userId = randomUUID();
  const frontend = await urlFor(target, 'frontend-proxy');
  const cartStatus = await postJson(`${frontend}/api/cart`, { userId, item: { productId: 'OLJCESPC7Z', quantity: 1 } });
  if (cartStatus !== 200) return failed('cart_http_status', cartStatus);
  const checkoutStatus = await postJson(`${frontend}/api/checkout?currencyCode=USD`, { ...checkoutPerson, userId });
  return statusReading('checkout_http_status', checkoutStatus);
}
