import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class BulkSetEntryDto {
  @ApiProperty({ example: 'favorites' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'JSON payload' })
  value: any;
}

export class BulkSetDto {
  @ApiProperty({ type: [BulkSetEntryDto] })
  @IsArray()
  entries: BulkSetEntryDto[];
}
