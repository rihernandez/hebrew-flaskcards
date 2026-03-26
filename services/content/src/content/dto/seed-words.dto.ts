import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class SeedWordsDto {
  @ApiPropertyOptional({ example: false, description: 'When true, replaces existing collection before importing.' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @ApiPropertyOptional({
    example: 'mobile',
    enum: ['mobile', 'root', 'auto'],
    description: 'Preferred source file: mobile-app/assets, project root, or auto-detect.',
  })
  @IsOptional()
  @IsIn(['mobile', 'root', 'auto'])
  source?: 'mobile' | 'root' | 'auto';
}
