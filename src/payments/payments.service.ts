import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Prisma } from '../generated/prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class PaymentsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  async createOrder(user: AuthenticatedUser, dto: CreateOrderDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, tenantId: user.tenantId, status: 'PUBLISHED' },
      select: { id: true, price: true, currency: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    const amount = dto.amountCents === undefined
      ? course.price ?? new Prisma.Decimal(0)
      : new Prisma.Decimal(dto.amountCents).div(100);
    const order = await this.prisma.order.create({
      data: {
        tenantId: user.tenantId,
        studentId: user.id,
        courseId: dto.courseId,
        amount,
        currency: dto.currency ?? course.currency ?? 'EUR',
        paymentMethod: dto.paymentMethod ?? 'POK',
        paymentProvider: 'POK',
        status: 'PENDING',
      },
    });
    return order;
  }

  async recordPaymentNotification(payload: { orderId: string; providerId: string; status: string; raw?: unknown }) {
    const order = await this.prisma.order.findUnique({ where: { id: payload.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'POK',
        providerId: payload.providerId,
        amount: order.amount as Prisma.Decimal,
        currency: order.currency,
        status: payload.status,
        rawResponse: payload.raw as Prisma.InputJsonValue | undefined,
      },
    });
    await this.prisma.order.update({ where: { id: order.id }, data: { status: payload.status } });

    if (payload.status === 'COMPLETED') {
      // create enrollment if not present
      await this.prisma.enrollment.upsert({
        where: { studentId_courseId: { studentId: order.studentId, courseId: order.courseId } },
        create: { studentId: order.studentId, courseId: order.courseId, status: 'ACTIVE' },
        update: { status: 'ACTIVE' },
      });
      // queue receipt email
      await this.prisma.emailLog.create({ data: { userId: order.studentId, template: 'RECEIPT', status: 'QUEUED' } });
      // create a payout record stub for the instructor
      await this.prisma.payout.create({ data: { tenantId: order.tenantId, amount: order.amount as Prisma.Decimal, currency: order.currency, scheduledAt: new Date(), status: 'SCHEDULED' } });
    }

    return { ok: true };
  }
}
