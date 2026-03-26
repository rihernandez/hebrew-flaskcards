import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

class BulkSetEntryDto {
  @ApiProperty({ example: 'favorites' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Arbitrary JSON payload' })
  value: any;
}

export class BulkSetDto {
  @ApiProperty({
    type: [Object],
    example: [
      { key: 'favorites', value: ['Hebreo_agua_Sustantivos'] },
      { key: 'darkMode', value: true },
    ],
  })
  @IsArray()
  entries: BulkSetEntryDto[];
}
