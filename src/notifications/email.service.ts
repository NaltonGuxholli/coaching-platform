import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  async sendQueued() {
    const queued = await this.prisma.emailLog.findMany({ where: { status: 'QUEUED' } });
    for (const e of queued) {
      try {
        // In production this would call an external provider. Here we mark SENT.
        await this.prisma.emailLog.update({ where: { id: e.id }, data: { status: 'SENT', sentAt: new Date() } });
      } catch (err) {
        try {
          await this.prisma.emailLog.update({ where: { id: e.id }, data: { status: 'FAILED' } });
        } catch {}
      }
    }
    return { sent: queued.length };
  }
}
