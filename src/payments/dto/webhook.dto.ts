import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class WebhookDto {
  @IsString()
  orderId: string;

  @IsString()
  providerId: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  raw?: unknown;
}