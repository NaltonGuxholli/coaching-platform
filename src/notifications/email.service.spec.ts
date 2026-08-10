import { EmailService } from './email.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('EmailService', () => {
  const makePrisma = () => ({
    emailLog: { findMany: jest.fn(), update: jest.fn() },
  });

  it('marks queued emails as sent', async () => {
    const prisma = makePrisma();
    prisma.emailLog.findMany.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
    prisma.emailLog.update.mockResolvedValue({});
    const svc = new EmailService(prisma as unknown as PrismaService);
    const res = await svc.sendQueued();
    expect(prisma.emailLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'QUEUED' } }));
    expect(prisma.emailLog.update).toHaveBeenCalled();
    expect(res).toEqual({ sent: 2 });
  });
});
