import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() brandName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() browserTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoLightUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoDarkUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() faviconUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() heroImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() secondaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tertiaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() backgroundColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fontHeading?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fontBody?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() baseThemeId?: string;
  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  locale?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  terminologyJson?: Record<string, unknown>;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  pageSectionsJson?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() customCss?: string;
}

export class CreateDomainDto {
  @ApiPropertyOptional({ example: 'coach.example.com' })
  @IsString()
  @IsNotEmpty()
  domain!: string;
}

export class UpdateDomainDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  sslStatus?: string;
}

export class CreateThemeDto {
  @ApiPropertyOptional() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() previewImage?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  tokenJson!: Record<string, unknown>;
}
