import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  courseId: string;

  @IsNumber()
  amountCents: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
