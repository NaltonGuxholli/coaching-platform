import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('PaymentsService', () => {
  const makePrisma = () => ({
    course: { findFirst: jest.fn() },
    order: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    payment: { create: jest.fn() },
    enrollment: { upsert: jest.fn() },
    emailLog: { create: jest.fn() },
    payout: { create: jest.fn() },
  });

  const makeService = () => {
    const prisma = makePrisma();
    return { prisma, service: new PaymentsService(prisma as unknown as PrismaService) };
  };

  const user = { id: 'student-1', tenantId: 'tenant-1' } as any;

  it('throws when creating an order for a missing course', async () => {
    const { prisma, service } = makeService();
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(service.createOrder(user, { courseId: 'missing' } as CreateOrderDto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an order when the course exists', async () => {
    const { prisma, service } = makeService();
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1', price: 1000, currency: 'USD' });
    prisma.order.create.mockResolvedValue({ id: 'order-1' });
    const result = await service.createOrder(user, { courseId: 'course-1' } as CreateOrderDto);
    expect(prisma.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ courseId: 'course-1' }) }));
    expect(result).toEqual({ id: 'order-1' });
  });

  it('throws when recording a notification for missing order', async () => {
    const { prisma, service } = makeService();
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.recordPaymentNotification({ orderId: 'missing', providerId: 'p1', status: 'COMPLETED' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records payment and creates enrollment/email/payout on COMPLETED', async () => {
    const { prisma, service } = makeService();
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', studentId: 'student-1', courseId: 'course-1', tenantId: 'tenant-1', amount: 10, currency: 'USD' });
    prisma.payment.create.mockResolvedValue({ id: 'pay-1' });
    prisma.order.update.mockResolvedValue({ id: 'order-1', status: 'COMPLETED' });
    prisma.enrollment.upsert.mockResolvedValue({ id: 'enroll-1' });
    prisma.emailLog.create.mockResolvedValue({ id: 'email-1' });
    prisma.payout.create.mockResolvedValue({ id: 'payout-1' });

    await expect(service.recordPaymentNotification({ orderId: 'order-1', providerId: 'p1', status: 'COMPLETED' })).resolves.toEqual({ ok: true });

    expect(prisma.payment.create).toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-1' }, data: { status: 'COMPLETED' } }));
    expect(prisma.enrollment.upsert).toHaveBeenCalled();
    expect(prisma.emailLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'student-1', template: 'RECEIPT' }) }));
    expect(prisma.payout.create).toHaveBeenCalled();
  });
});
