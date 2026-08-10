import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { UsersModule } from './users/users.module';
import { PlatformModule } from './platform/platform.module';
import { TenantModule } from './tenant/tenant.module';
import { PaymentsModule } from './payments/payments.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VideoService } from './video/video.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WorkflowsModule,
    UsersModule,
    AuthModule,
    PaymentsModule,
    PayoutsModule,
    NotificationsModule,
    PlatformModule,
    TenantModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    VideoService,
  ],
})
export class AppModule {}
