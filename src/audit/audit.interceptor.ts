import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return next.handle();
    if (!this.prisma.auditLog) return next.handle();
    return next.handle().pipe(
      tap(() => {
        void this.prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action: `${request.method} ${request.path}`,
              entityType: context.getClass().name,
              entityId: String(
                request.params?.id ??
                  request.params?.courseId ??
                  request.params?.tenantId ??
                  'collection',
              ),
              metadata: { query: JSON.stringify(request.query) },
              ipAddress: request.ip,
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}
