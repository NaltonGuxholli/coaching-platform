import { IsString, IsNotEmpty } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}
