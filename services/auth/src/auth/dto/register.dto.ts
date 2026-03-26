import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { LanguageLevel } from '../schemas/user.schema';

export class RegisterDto {
  @ApiProperty({ example: 'Richard' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'HC' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'richard@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 28 })
  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @ApiProperty({ example: 'Israel' })
  @IsString()
  country: string;

  @ApiProperty({ example: 'Hebrew' })
  @IsString()
  nativeLanguage: string;

  @ApiProperty({ example: 'Spanish' })
  @IsString()
  learningLanguage: string;

  @ApiProperty({ enum: LanguageLevel, example: LanguageLevel.BEGINNER })
  @IsEnum(LanguageLevel)
  languageLevel: LanguageLevel;

  @ApiProperty({ example: 20, required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(23)
  notificationHour?: number;

  @ApiProperty({ example: 0, required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  notificationMinute?: number;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  speakingUnlocked?: boolean;
}
