import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { ContentGatewayService } from './content.service';

@ApiTags('Content')
@ApiBearerAuth()
@UseGuards(AuthTokenGuard)
@Controller('content')
export class ContentGatewayController {
  constructor(private readonly contentService: ContentGatewayService) {}

  @Get('languages')
  @ApiOperation({ summary: 'Get available languages from words collection' })
  languages() {
    return this.contentService.languages();
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get topics (optionally filtered by language)' })
  topics(@Query('language') language?: string) {
    return this.contentService.topics(language);
  }

  @Get('words')
  @ApiOperation({ summary: 'List words with filters, search and pagination' })
  words(@Query() query: Record<string, any>) {
    return this.contentService.words(query);
  }

  @Get('words/:id')
  @ApiOperation({ summary: 'Get one word by id' })
  wordById(@Param('id') id: string) {
    return this.contentService.wordById(id);
  }

  @Post('words')
  @ApiOperation({ summary: 'Create a new word' })
  createWord(@Body() dto: any) {
    return this.contentService.createWord(dto);
  }

  @Put('words/:id')
  @ApiOperation({ summary: 'Replace a word document by id' })
  replaceWord(@Param('id') id: string, @Body() dto: any) {
    return this.contentService.replaceWord(id, dto);
  }

  @Patch('words/:id')
  @ApiOperation({ summary: 'Partially update a word by id' })
  updateWord(@Param('id') id: string, @Body() dto: any) {
    return this.contentService.updateWord(id, dto);
  }

  @Delete('words/:id')
  @ApiOperation({ summary: 'Delete a word by id' })
  deleteWord(@Param('id') id: string) {
    return this.contentService.deleteWord(id);
  }

  @Post('words/seed')
  @ApiOperation({ summary: 'Import words from flashcards.words.json' })
  @ApiBody({ required: false })
  seedWords(@Body() body?: { force?: boolean; source?: 'mobile' | 'root' | 'auto' }) {
    return this.contentService.seedWords(body);
  }

  @Get('speaking/situations')
  @ApiOperation({ summary: 'Get speaking situations' })
  speakingSituations(@Query('count') count?: string) {
    return this.contentService.speakingSituations(count ? Number(count) : 2);
  }

  @Get('speaking/translation-pairs')
  @ApiOperation({ summary: 'Get translation pairs for speaking activity' })
  translationPairs(@Query('count') count?: string) {
    return this.contentService.translationPairs(count ? Number(count) : 5);
  }

  @Get('speaking/lectura')
  @ApiOperation({ summary: 'Get one reading paragraph' })
  lectura() {
    return this.contentService.lectura();
  }

  @Get('speaking/dictado-levels')
  @ApiOperation({ summary: 'Get dictation levels' })
  dictadoLevels() {
    return this.contentService.dictadoLevels();
  }
}
