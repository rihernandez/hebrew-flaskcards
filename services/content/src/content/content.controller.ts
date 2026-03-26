import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { ContentService } from './content.service';
import { CreateWordDto } from './dto/create-word.dto';
import { ListWordsDto } from './dto/list-words.dto';
import { SeedWordsDto } from './dto/seed-words.dto';
import { UpdateWordDto } from './dto/update-word.dto';

@ApiTags('Content')
@ApiBearerAuth()
@UseGuards(AuthTokenGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('languages')
  @ApiOperation({ summary: 'Get available languages from words collection' })
  languages() {
    return this.contentService.getLanguages();
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get topics (optionally filtered by language)' })
  topics(@Query('language') language?: string) {
    return this.contentService.getTopics(language);
  }

  @Get('words')
  @ApiOperation({ summary: 'List words with filters, search and pagination' })
  words(@Query() query: ListWordsDto) {
    return this.contentService.listWords(query);
  }

  @Get('words/:id')
  @ApiOperation({ summary: 'Get one word by id' })
  wordById(@Param('id') id: string) {
    return this.contentService.getWordById(id);
  }

  @Post('words')
  @ApiOperation({ summary: 'Create a new word' })
  createWord(@Body() dto: CreateWordDto) {
    return this.contentService.createWord(dto);
  }

  @Put('words/:id')
  @ApiOperation({ summary: 'Replace a word document by id' })
  replaceWord(@Param('id') id: string, @Body() dto: CreateWordDto) {
    return this.contentService.replaceWord(id, dto);
  }

  @Patch('words/:id')
  @ApiOperation({ summary: 'Partially update a word by id' })
  updateWord(@Param('id') id: string, @Body() dto: UpdateWordDto) {
    return this.contentService.updateWord(id, dto);
  }

  @Delete('words/:id')
  @ApiOperation({ summary: 'Delete a word by id' })
  deleteWord(@Param('id') id: string) {
    return this.contentService.deleteWord(id);
  }

  @Post('words/seed')
  @ApiOperation({ summary: 'Import words from flashcards.words.json' })
  @ApiBody({ type: SeedWordsDto, required: false })
  seedWords(@Body() body?: SeedWordsDto) {
    return this.contentService.seedFromJson({
      force: Boolean(body?.force),
      sourcePreference: body?.source ?? 'mobile',
    });
  }

  @Get('speaking/situations')
  @ApiOperation({ summary: 'Get speaking situations' })
  speakingSituations(@Query('count') count?: string) {
    return this.contentService.getSpeakingSituations(count ? Number(count) : 2);
  }

  @Get('speaking/translation-pairs')
  @ApiOperation({ summary: 'Get translation pairs for speaking activity' })
  translationPairs(@Query('count') count?: string) {
    return this.contentService.getTranslationPairs(count ? Number(count) : 5);
  }

  @Get('speaking/lectura')
  @ApiOperation({ summary: 'Get one reading paragraph' })
  lectura() {
    return this.contentService.getLecturaParagraph();
  }

  @Get('speaking/dictado-levels')
  @ApiOperation({ summary: 'Get dictation levels' })
  dictadoLevels() {
    return this.contentService.getDictadoLevels();
  }
}
