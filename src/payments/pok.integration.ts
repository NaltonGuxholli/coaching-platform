import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';

@Injectable()
export class PokService {
  private readonly logger = new Logger(PokService.name);

  async createCheckout(order: { id: string; amount: any; currency: string }) {
    const apiUrl = process.env.POK_API_URL;
    const apiKey = process.env.POK_API_KEY;
    if (!apiUrl) {
      // fallback deterministic stub when no external API configured
      const providerId = `pok_${order.id}`;
      const checkoutUrl = `https://pok.example/pay/${providerId}`;
      return { providerId, checkoutUrl };
    }

    const body = { orderId: order.id, amount: order.amount?.toString?.() ?? order.amount, currency: order.currency };
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/checkout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`pok createCheckout failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      this.logger.warn('POK createCheckout failed, falling back to stub', err as any);
      const providerId = `pok_${order.id}`;
      const checkoutUrl = `https://pok.example/pay/${providerId}`;
      return { providerId, checkoutUrl };
    }
  }

  verifyWebhookSignature(payload: any, signature?: string) {
    const secret = process.env.POK_WEBHOOK_SECRET;
    if (!secret) return true;
    // compute HMAC of raw payload string
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const h = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    return h === signature;
  }
}
