import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}

export class ReviewReportDto {
  @ApiProperty({ enum: ['RESOLVED', 'REJECTED'] })
  @IsIn(['RESOLVED', 'REJECTED'])
  status!: 'RESOLVED' | 'REJECTED';
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  resolutionNote?: string;
}
