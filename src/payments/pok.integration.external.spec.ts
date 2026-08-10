import { PokService } from './pok.integration';

describe('PokService external flow', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.POK_API_URL;
    delete process.env.POK_API_KEY;
  });

  it('calls external POK endpoint when configured', async () => {
    process.env.POK_API_URL = 'https://api.pok.example';
    process.env.POK_API_KEY = 'test-key';

    const mockedResponse = { providerId: 'pok_order-1', checkoutUrl: 'https://pok.example/pay/pok_order-1' };
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockedResponse });

    const svc = new PokService();
    const result = await svc.createCheckout({ id: 'order-1', amount: 10, currency: 'EUR' } as any);

    expect(globalThis.fetch).toHaveBeenCalledWith('https://api.pok.example/checkout', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
    }));
    expect(result).toEqual(mockedResponse);
  });

  it('falls back if external POK call fails', async () => {
    process.env.POK_API_URL = 'https://api.pok.example';
    process.env.POK_API_KEY = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const svc = new PokService();
    const result = await svc.createCheckout({ id: 'order-1', amount: 10, currency: 'EUR' } as any);

    expect(result.checkoutUrl).toContain('https://pok.example/pay/');
  });
});
