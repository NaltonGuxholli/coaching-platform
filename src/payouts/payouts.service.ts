import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class PayoutsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  listForTenant(user: AuthenticatedUser) {
    return this.prisma.payout.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async schedulePayout(
    user: AuthenticatedUser,
    amountCents: number,
    currency = 'EUR',
  ) {
    const amount = new Prisma.Decimal(amountCents).div(100);
    return this.prisma.$transaction(async (transaction) => {
      const [sales, payouts] = await Promise.all([
        transaction.order.aggregate({
          where: { tenantId: user.tenantId, status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        transaction.payout.aggregate({
          where: { tenantId: user.tenantId, status: { not: 'CANCELLED' } },
          _sum: { amount: true },
        }),
      ]);
      const available = (sales._sum.amount ?? new Prisma.Decimal(0)).sub(
        payouts._sum.amount ?? new Prisma.Decimal(0),
      );
      if (amount.greaterThan(available))
        throw new Error('Insufficient payout balance');
      return transaction.payout.create({
        data: {
          tenantId: user.tenantId,
          amount,
          currency,
          scheduledAt: new Date(),
          status: 'SCHEDULED',
        },
      });
    });
  }

  async exportCsv(user: AuthenticatedUser) {
    const payouts = await this.prisma.payout.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { scheduledAt: 'desc' },
    });
    const rows = [
      ['id', 'amount', 'currency', 'status', 'scheduledAt', 'createdAt'],
    ];
    for (const p of payouts)
      rows.push([
        p.id,
        p.amount.toString(),
        p.currency,
        p.status,
        p.scheduledAt.toISOString(),
        p.createdAt.toISOString(),
      ]);
    return rows.map((r) => r.join(',')).join('\n');
  }
}
