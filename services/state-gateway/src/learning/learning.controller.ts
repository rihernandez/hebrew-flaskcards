import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { UpsertValueDto } from '../common/dto/upsert-value.dto';
import { BulkGetDto } from '../common/dto/bulk-get.dto';
import { BulkSetDto } from '../common/dto/bulk-set.dto';
import { AuthTokenGuard } from '../auth/auth-token.guard';

@ApiTags('Learning State')
@ApiBearerAuth()
@UseGuards(AuthTokenGuard)
@Controller('learning-state')
export class LearningController {
  constructor(private readonly service: LearningService) {}

  @Get()
  @ApiOperation({ summary: 'List all learning-state keys' })
  list(@Req() req) { return this.service.list(req.user.userId); }

  @Get(':key')
  @ApiOperation({ summary: 'Get learning-state key' })
  get(@Req() req, @Param('key') key: string) { return this.service.get(req.user.userId, key); }

  @Patch(':key')
  @ApiOperation({ summary: 'Set learning-state key' })
  set(@Req() req, @Param('key') key: string, @Body() dto: UpsertValueDto) {
    return this.service.set(req.user.userId, key, dto.value);
  }

  @Post('bulk-get')
  @ApiOperation({ summary: 'Get multiple learning-state keys' })
  bulkGet(@Req() req, @Body() dto: BulkGetDto) { return this.service.bulkGet(req.user.userId, dto.keys); }

  @Post('bulk-set')
  @ApiOperation({ summary: 'Set multiple learning-state keys' })
  bulkSet(@Req() req, @Body() dto: BulkSetDto) { return this.service.bulkSet(req.user.userId, dto.entries); }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete one learning-state key' })
  delete(@Req() req, @Param('key') key: string) { return this.service.delete(req.user.userId, key); }

  @Delete()
  @ApiOperation({ summary: 'Clear learning-state keys' })
  clear(@Req() req) { return this.service.clear(req.user.userId); }
}
