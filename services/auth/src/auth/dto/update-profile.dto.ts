import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { LanguageLevel } from '../schemas/user.schema';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Richard' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'HC' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ example: 'Israel' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Spanish' })
  @IsOptional()
  @IsString()
  learningLanguage?: string;

  @ApiPropertyOptional({ enum: LanguageLevel })
  @IsOptional()
  @IsEnum(LanguageLevel)
  languageLevel?: LanguageLevel;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(23)
  notificationHour?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  notificationMinute?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  speakingUnlocked?: boolean;
}
