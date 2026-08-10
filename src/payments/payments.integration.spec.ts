import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PokService } from './pok.integration';

// This is an integration-like unit test that wires controller + service stubs

describe('Payments integration', () => {
  it('creates checkout and handles webhook', async () => {
    // make a fake prisma that PaymentsService expects
    const prisma = {
      course: { findFirst: jest.fn().mockResolvedValue({ id: 'course-1', price: 1000, currency: 'USD' }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order-1', amount: 10, currency: 'USD', studentId: 'student-1', tenantId: 'tenant-1', courseId: 'course-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'order-1', amount: 10, currency: 'USD', studentId: 'student-1', tenantId: 'tenant-1', courseId: 'course-1' }), update: jest.fn() },
      payment: { create: jest.fn() },
      enrollment: { upsert: jest.fn() },
      emailLog: { create: jest.fn() },
      payout: { create: jest.fn() },
    } as any;

    const paymentsService = new PaymentsService(prisma as any);
    const pokService = new PokService();
    const controller = new PaymentsController(paymentsService, pokService);

    // create order via service
    const order = await paymentsService.createOrder({ id: 'student-1', tenantId: 'tenant-1' } as any, { courseId: 'course-1' } as any);
    expect(prisma.order.create).toHaveBeenCalled();

    // checkout
    const checkout = await controller.pokCheckout({ orderId: 'order-1' });
    expect(checkout.checkoutUrl).toBeDefined();

    // webhook: should process and create payment/enrollment
    const res = await controller.pokWebhook({ orderId: 'order-1', providerId: 'p1', status: 'COMPLETED' }, undefined as any);
    expect(res).toEqual({ ok: true });
    expect(prisma.payment.create).toHaveBeenCalled();
    expect(prisma.enrollment.upsert).toHaveBeenCalled();
  });
});
