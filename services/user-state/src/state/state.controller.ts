import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StateService } from './state.service';
import { UpsertStateDto } from './dto/upsert-state.dto';
import { BulkGetDto } from './dto/bulk-get.dto';
import { BulkSetDto } from './dto/bulk-set.dto';

@ApiTags('State')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get()
  @ApiOperation({ summary: 'List all key/value state entries for current user' })
  list(@Req() req) {
    return this.stateService.list(req.user.userId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get state value by key for current user' })
  get(@Req() req, @Param('key') key: string) {
    return this.stateService.get(req.user.userId, key).then(value => ({ key, value }));
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Upsert state value by key for current user' })
  upsert(@Req() req, @Param('key') key: string, @Body() dto: UpsertStateDto) {
    return this.stateService.upsert(req.user.userId, key, dto.value);
  }

  @Post('bulk-get')
  @ApiOperation({ summary: 'Get multiple keys in one request' })
  bulkGet(@Req() req, @Body() dto: BulkGetDto) {
    return this.stateService.bulkGet(req.user.userId, dto.keys);
  }

  @Post('bulk-set')
  @ApiOperation({ summary: 'Set multiple key/value entries in one request' })
  bulkSet(@Req() req, @Body() dto: BulkSetDto) {
    return this.stateService.bulkSet(req.user.userId, dto.entries);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete one state key for current user' })
  remove(@Req() req, @Param('key') key: string) {
    return this.stateService.remove(req.user.userId, key);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all state keys for current user' })
  clear(@Req() req) {
    return this.stateService.clear(req.user.userId);
  }
}
