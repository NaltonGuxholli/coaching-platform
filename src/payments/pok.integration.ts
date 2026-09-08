import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';

@Injectable()
export class PokService {
  private readonly logger = new Logger(PokService.name);

  async createCheckout(order: {
    id: string;
    amount: number | string | { toString(): string };
    currency: string;
  }) {
    const apiUrl = process.env.POK_API_URL;
    const apiKey = process.env.POK_API_KEY;
    if (!apiUrl) {
      // fallback deterministic stub when no external API configured
      const providerId = `pok_${order.id}`;
      const checkoutUrl = `https://pok.example/pay/${providerId}`;
      return { providerId, checkoutUrl };
    }

    const body = {
      orderId: order.id,
      amount: String(order.amount),
      currency: order.currency,
    };
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/checkout`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`pok createCheckout failed: ${res.status}`);
      const result: unknown = await res.json();
      if (
        !result ||
        typeof result !== 'object' ||
        !('providerId' in result) ||
        !('checkoutUrl' in result)
      ) {
        throw new Error('POK checkout response is invalid');
      }
      return result as { providerId: string; checkoutUrl: string };
    } catch (err) {
      this.logger.warn('POK createCheckout failed, falling back to stub', err);
      const providerId = `pok_${order.id}`;
      const checkoutUrl = `https://pok.example/pay/${providerId}`;
      return { providerId, checkoutUrl };
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature?: string) {
    const secret = process.env.POK_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest();
    const received = Buffer.from(signature, 'hex');
    return (
      received.length === expected.length &&
      crypto.timingSafeEqual(expected, received)
    );
  }
}
