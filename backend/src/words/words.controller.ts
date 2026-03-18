import { Controller, Get, Query } from '@nestjs/common';
import { WordsService } from './words.service';
import { Word } from './interfaces/word.interface';

@Controller('api')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get('languages')
  async getLanguages(): Promise<string[]> {
    return this.wordsService.getLanguages();
  }

  @Get('topics')
  async getTopics(@Query('language') language: string): Promise<string[]> {
    return this.wordsService.getTopics(language);
  }

  @Get('words')
  async getWords(
    @Query('language') language: string,
    @Query('topic') topic: string,
  ): Promise<Word[]> {
    return this.wordsService.getWords(language, topic);
  }
}
