import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class BulkGetDto {
  @ApiProperty({ type: [String], example: ['favorites', 'streak_data'] })
  @IsArray()
  @IsString({ each: true })
  keys: string[];
}
