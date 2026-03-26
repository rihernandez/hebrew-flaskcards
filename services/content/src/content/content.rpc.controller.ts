import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContentService } from './content.service';

@Controller()
export class ContentRpcController {
  constructor(private readonly contentService: ContentService) {}

  @MessagePattern({ cmd: 'content.languages' })
  languages() {
    return this.contentService.getLanguages();
  }

  @MessagePattern({ cmd: 'content.topics' })
  topics(@Payload() payload: { language?: string }) {
    return this.contentService.getTopics(payload?.language);
  }

  @MessagePattern({ cmd: 'content.words.list' })
  words(@Payload() payload: any) {
    return this.contentService.listWords(payload ?? {});
  }

  @MessagePattern({ cmd: 'content.words.get' })
  wordById(@Payload() payload: { id: string }) {
    return this.contentService.getWordById(payload.id);
  }

  @MessagePattern({ cmd: 'content.words.create' })
  createWord(@Payload() payload: any) {
    return this.contentService.createWord(payload);
  }

  @MessagePattern({ cmd: 'content.words.replace' })
  replaceWord(@Payload() payload: { id: string; data: any }) {
    return this.contentService.replaceWord(payload.id, payload.data);
  }

  @MessagePattern({ cmd: 'content.words.update' })
  updateWord(@Payload() payload: { id: string; data: any }) {
    return this.contentService.updateWord(payload.id, payload.data);
  }

  @MessagePattern({ cmd: 'content.words.delete' })
  deleteWord(@Payload() payload: { id: string }) {
    return this.contentService.deleteWord(payload.id);
  }

  @MessagePattern({ cmd: 'content.words.seed' })
  seedWords(@Payload() payload?: { force?: boolean; source?: 'mobile' | 'root' | 'auto' }) {
    return this.contentService.seedFromJson({
      force: Boolean(payload?.force),
      sourcePreference: payload?.source ?? 'mobile',
    });
  }

  @MessagePattern({ cmd: 'content.speaking.situations' })
  speakingSituations(@Payload() payload?: { count?: number }) {
    return this.contentService.getSpeakingSituations(payload?.count ?? 2);
  }

  @MessagePattern({ cmd: 'content.speaking.translation_pairs' })
  translationPairs(@Payload() payload?: { count?: number }) {
    return this.contentService.getTranslationPairs(payload?.count ?? 5);
  }

  @MessagePattern({ cmd: 'content.speaking.lectura' })
  lectura() {
    return this.contentService.getLecturaParagraph();
  }

  @MessagePattern({ cmd: 'content.speaking.dictado_levels' })
  dictadoLevels() {
    return this.contentService.getDictadoLevels();
  }
}
