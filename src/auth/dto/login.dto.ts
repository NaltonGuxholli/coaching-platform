import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    description: 'Tenant id; use tenantSlug for public signup flows',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Branded tenant slug' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantSlug?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description: 'Six-digit MFA code when MFA is enabled',
  })
  @IsOptional()
  @IsString()
  mfaCode?: string;
}
