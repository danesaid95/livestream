import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsEnum, IsBoolean, IsArray, IsDateString } from 'class-validator';
import { StreamCategory } from '../entities/stream.entity';

export class CreateStreamDto {
  @ApiProperty({ example: 'My Awesome Stream' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Join me for some fun gaming!' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: StreamCategory, default: StreamCategory.OTHER })
  @IsOptional()
  @IsEnum(StreamCategory)
  category?: StreamCategory;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMature?: boolean;

  @ApiPropertyOptional({ example: ['gaming', 'fun', 'interactive'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: '2024-01-15T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;
}
