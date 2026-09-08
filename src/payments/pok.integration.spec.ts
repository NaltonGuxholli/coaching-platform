import { PokService } from './pok.integration';
import crypto from 'crypto';

describe('PokService', () => {
  beforeEach(() => {
    process.env.POK_WEBHOOK_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.POK_WEBHOOK_SECRET;
    delete process.env.POK_API_URL;
  });

  it('falls back to stub when no POK_API_URL', async () => {
    const svc = new PokService();
    const res = await svc.createCheckout({
      id: 'order-1',
      amount: 100,
      currency: 'EUR',
    });
    expect(res.providerId).toBeDefined();
    expect(res.checkoutUrl).toContain('pok.example');
  });

  it('verifies webhook signature when secret is set', () => {
    process.env.POK_WEBHOOK_SECRET = 'shh';
    const svc = new PokService();
    const payload = { orderId: 'o1' };
    const raw = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', 'shh').update(raw).digest('hex');
    expect(svc.verifyWebhookSignature(raw, sig)).toBeTruthy();
    expect(svc.verifyWebhookSignature(raw, 'bad')).toBeFalsy();
  });
});
