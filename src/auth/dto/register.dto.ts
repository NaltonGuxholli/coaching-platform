import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({ description: 'Legacy tenant id' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Branded tenant slug' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantSlug?: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
