import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';
import { TimerType } from '../../generated/prisma/enums';

export class CreateCourseDto {
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiProperty() @IsString() @IsNotEmpty() slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() level?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnailUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents?: number;
  @ApiPropertyOptional({ default: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;
  @ApiPropertyOptional({
    enum: ['ONE_TIME', 'SUBSCRIPTION'],
    default: 'ONE_TIME',
  })
  @IsOptional()
  @IsEnum(['ONE_TIME', 'SUBSCRIPTION'])
  billingType?: 'ONE_TIME' | 'SUBSCRIPTION';
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CreateModuleDto {
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) orderIndex!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() scheduleLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRestDay?: boolean;
}

export class AddLessonDto {
  @ApiProperty() @IsString() libraryItemId!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) orderIndex!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() moduleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFreePreview?: boolean;
}

export class CreateLibraryItemDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() difficulty?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadataJson?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() tags?: string[];
}

export class ProgressDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) watchedSeconds!: number;
  @ApiProperty() @IsBoolean() completed!: boolean;
}

export class CreateTimerDto {
  @ApiProperty({ enum: TimerType }) @IsEnum(TimerType) type!: TimerType;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rounds?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  restTime?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoAdvance?: boolean;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  vibrationEnabled?: boolean;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  alertPointsJson?: Record<string, unknown>;
}

export class RoundLogDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) roundNumber!: number;
  @ApiProperty() @IsString() @MinLength(1) value!: string;
}

export class TimerStateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  elapsedSeconds?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  remainingSeconds?: number;
}

export class CreateVideoAssetDto {
  @ApiProperty() @IsString() @IsNotEmpty() fileName!: string;
  @ApiProperty({
    description:
      'Streaming-provider HLS/DASH URL, never a raw downloadable file URL',
  })
  @IsUrl({ require_tld: false })
  videoUrl!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional({ enum: ['HLS', 'DASH'] })
  @IsOptional()
  @IsEnum(['HLS', 'DASH'])
  streamingFormat?: 'HLS' | 'DASH';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() drmEnabled?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  captionsUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transcript?: string;
}

export class CreateFileAssetDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({
    description:
      'Storage-provider URL; file bytes are not stored in the API server',
  })
  @IsUrl({ require_tld: false })
  url!: string;
  @ApiProperty() @IsString() @IsNotEmpty() type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) size!: number;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isProtected?: boolean;
}

export class EngagementDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  watchedSeconds?: number;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class CreateReportDto {
  @ApiProperty({ example: 'COURSE_LESSON' })
  @IsString()
  @IsNotEmpty()
  entityType!: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityId!: string;
  @ApiProperty({
    example: 'This content appears to violate the platform terms.',
  })
  @IsString()
  @MinLength(3)
  reason!: string;
}
