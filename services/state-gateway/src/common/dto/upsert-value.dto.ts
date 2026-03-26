import { ApiProperty } from '@nestjs/swagger';

export class UpsertValueDto {
  @ApiProperty({ description: 'JSON payload for the given key' })
  value: any;
}
