import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class PasswordResetRequestDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tenantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tenantSlug?: string;
}

export class PasswordResetDto {
  @ApiProperty() @IsString() token!: string;
  @ApiProperty({ minLength: 8, format: 'password' })
  @IsString()
  @MinLength(8)
  password!: string;
}
