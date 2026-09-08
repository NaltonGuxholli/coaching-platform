import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SchedulePayoutDto {
  @IsInt()
  @Min(1)
  amountCents: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
