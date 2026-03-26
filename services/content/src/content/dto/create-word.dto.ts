import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWordDto {
  @ApiProperty({ example: 'שלום' })
  @IsString()
  @MaxLength(200)
  word: string;

  @ApiProperty({ example: 'shalom' })
  @IsString()
  @MaxLength(200)
  pronunciation: string;

  @ApiProperty({ example: 'hola' })
  @IsString()
  @MaxLength(2000)
  meaning: string;

  @ApiProperty({ type: [String], example: ['שלום חבר', 'מה שלומך?'] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  examples: string[];

  @ApiProperty({ example: 'Spanish' })
  @IsString()
  @MaxLength(120)
  language: string;

  @ApiProperty({ example: 'Saludos' })
  @IsString()
  @MaxLength(120)
  topic: string;

  @ApiPropertyOptional({ example: 'Conversación' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({ example: 'n/a' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  genre?: string;
}
