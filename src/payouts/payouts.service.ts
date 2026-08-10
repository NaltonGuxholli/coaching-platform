import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';

@Injectable()
export class PayoutsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  listForTenant(user: AuthenticatedUser) {
    return this.prisma.payout.findMany({ where: { tenantId: user.tenantId }, orderBy: { scheduledAt: 'desc' } });
  }

  async schedulePayout(user: AuthenticatedUser, amount: number, currency = 'EUR') {
    return this.prisma.payout.create({ data: { tenantId: user.tenantId, amount: amount as any, currency, scheduledAt: new Date(), status: 'SCHEDULED' } });
  }

  async exportCsv(user: AuthenticatedUser) {
    const payouts = await this.prisma.payout.findMany({ where: { tenantId: user.tenantId }, orderBy: { scheduledAt: 'desc' } });
    const rows = [['id','amount','currency','status','scheduledAt','createdAt']];
    for (const p of payouts) rows.push([p.id, p.amount.toString(), p.currency, p.status, p.scheduledAt.toISOString(), p.createdAt.toISOString()]);
    return rows.map((r) => r.join(',')).join('\n');
  }
}
