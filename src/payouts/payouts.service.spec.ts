import { PayoutsService } from './payouts.service';
import type { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

describe('PayoutsService', () => {
  const makePrisma = () => ({
    payout: { findMany: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
    order: { aggregate: jest.fn() },
    $transaction: jest.fn(),
  });

  it('lists payouts for tenant and schedules a payout', async () => {
    const prisma = makePrisma();
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) => callback(prisma));
    prisma.payout.findMany.mockResolvedValue([{ id: 'p1', amount: 100, currency: 'EUR', status: 'SCHEDULED', scheduledAt: new Date(), createdAt: new Date() }]);
    prisma.payout.create.mockResolvedValue({ id: 'p2' });

    const svc = new PayoutsService(prisma as unknown as PrismaService);
    const user = { tenantId: 'tenant-1' } as any;

    const list = await svc.listForTenant(user);
    expect(prisma.payout.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1' } }));

    prisma.order.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(10) } });
    prisma.payout.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(0) } });
    const created = await svc.schedulePayout(user, 200, 'USD');
    expect(prisma.payout.create).toHaveBeenCalled();
    expect(created).toEqual({ id: 'p2' });
  });

  it('exports CSV', async () => {
    const prisma = makePrisma();
    const now = new Date();
    prisma.payout.findMany.mockResolvedValue([{ id: 'p1', amount: { toString: () => '100' }, currency: 'EUR', status: 'SCHEDULED', scheduledAt: now, createdAt: now }]);
    const svc = new PayoutsService(prisma as unknown as PrismaService);
    const csv = await svc.exportCsv({ tenantId: 'tenant-1' } as any);
    expect(csv).toContain('id,amount,currency');
    expect(csv).toContain('p1');
  });
});
