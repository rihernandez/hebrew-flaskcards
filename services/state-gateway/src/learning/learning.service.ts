import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LearningService {
  constructor(@Inject('LEARNING_CLIENT') private readonly client: ClientProxy) {}

  list(userId: string) { return firstValueFrom(this.client.send({ cmd: 'learning.list' }, { userId })); }
  get(userId: string, key: string) { return firstValueFrom(this.client.send({ cmd: 'learning.get' }, { userId, key })); }
  set(userId: string, key: string, value: any) { return firstValueFrom(this.client.send({ cmd: 'learning.set' }, { userId, key, value })); }
  bulkGet(userId: string, keys: string[]) { return firstValueFrom(this.client.send({ cmd: 'learning.bulk_get' }, { userId, keys })); }
  bulkSet(userId: string, entries: { key: string; value: any }[]) { return firstValueFrom(this.client.send({ cmd: 'learning.bulk_set' }, { userId, entries })); }
  delete(userId: string, key: string) { return firstValueFrom(this.client.send({ cmd: 'learning.delete' }, { userId, key })); }
  clear(userId: string) { return firstValueFrom(this.client.send({ cmd: 'learning.clear' }, { userId })); }
}
