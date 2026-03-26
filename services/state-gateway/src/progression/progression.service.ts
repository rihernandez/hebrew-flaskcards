import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProgressionService {
  constructor(@Inject('PROGRESSION_CLIENT') private readonly client: ClientProxy) {}

  list(userId: string) { return firstValueFrom(this.client.send({ cmd: 'progression.list' }, { userId })); }
  get(userId: string, key: string) { return firstValueFrom(this.client.send({ cmd: 'progression.get' }, { userId, key })); }
  set(userId: string, key: string, value: any) { return firstValueFrom(this.client.send({ cmd: 'progression.set' }, { userId, key, value })); }
  bulkGet(userId: string, keys: string[]) { return firstValueFrom(this.client.send({ cmd: 'progression.bulk_get' }, { userId, keys })); }
  bulkSet(userId: string, entries: { key: string; value: any }[]) { return firstValueFrom(this.client.send({ cmd: 'progression.bulk_set' }, { userId, entries })); }
  delete(userId: string, key: string) { return firstValueFrom(this.client.send({ cmd: 'progression.delete' }, { userId, key })); }
  clear(userId: string) { return firstValueFrom(this.client.send({ cmd: 'progression.clear' }, { userId })); }
}
