import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EmailService } from './email.service';

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private interval?: NodeJS.Timeout;
  private readonly pollIntervalMs = Number(process.env.EMAIL_PROCESS_INTERVAL_MS ?? '30000');

  constructor(private readonly emailService: EmailService) {}

  onModuleInit() {
    this.logger.log(`Starting notification processor every ${this.pollIntervalMs}ms`);
    this.interval = setInterval(async () => {
      try {
        const result = await this.emailService.sendQueued();
        if (result.sent) {
          this.logger.log(`Sent ${result.sent} queued emails`);
        }
      } catch (error) {
        this.logger.warn('Notification processor failed', error as any);
      }
    }, this.pollIntervalMs);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.logger.log('Stopped notification processor');
    }
  }
}
