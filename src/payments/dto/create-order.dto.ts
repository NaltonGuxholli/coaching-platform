import { IsString, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  courseId: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
