import { ApiProperty } from '@nestjs/swagger';

export class UpsertStateDto {
  @ApiProperty({ description: 'JSON value to store for this key' })
  value: any;
}
