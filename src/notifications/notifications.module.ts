import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { NotificationProcessor } from './notification.processor';

@Module({
  providers: [EmailService, NotificationProcessor],
  exports: [EmailService],
})
export class NotificationsModule {}
