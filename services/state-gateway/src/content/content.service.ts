import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ContentGatewayService {
  constructor(@Inject('CONTENT_CLIENT') private readonly client: ClientProxy) {}

  languages() {
    return firstValueFrom(this.client.send({ cmd: 'content.languages' }, {}));
  }

  topics(language?: string) {
    return firstValueFrom(this.client.send({ cmd: 'content.topics' }, { language }));
  }

  words(query: Record<string, any>) {
    return firstValueFrom(this.client.send({ cmd: 'content.words.list' }, query));
  }

  wordById(id: string) {
    return firstValueFrom(this.client.send({ cmd: 'content.words.get' }, { id }));
  }

  createWord(dto: any) {
    return firstValueFrom(this.client.send({ cmd: 'content.words.create' }, dto));
  }

  replaceWord(id: string, dto: any) {
    return firstValueFrom(this.client.send({ cmd: 'content.words.replace' }, { id, data: dto }));
  }

  updateWord(id: string, dto: any) {
    return firstValueFrom(this.client.send({ cmd: 'content.words.update' }, { id, data: dto }));
  }

  deleteWord(id: string) {
    return firstValueFrom(this.client.send({ cmd: 'content.words.delete' }, { id }));
  }

  seedWords(body?: { force?: boolean; source?: 'mobile' | 'root' | 'auto' }) {
    return firstValueFrom(this.client.send({ cmd: 'content.words.seed' }, body ?? {}));
  }

  speakingSituations(count?: number) {
    return firstValueFrom(this.client.send({ cmd: 'content.speaking.situations' }, { count }));
  }

  translationPairs(count?: number) {
    return firstValueFrom(this.client.send({ cmd: 'content.speaking.translation_pairs' }, { count }));
  }

  lectura() {
    return firstValueFrom(this.client.send({ cmd: 'content.speaking.lectura' }, {}));
  }

  dictadoLevels() {
    return firstValueFrom(this.client.send({ cmd: 'content.speaking.dictado_levels' }, {}));
  }
}
