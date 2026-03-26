import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PreferencesService {
  constructor(@Inject('PREFS_CLIENT') private readonly client: ClientProxy) {}

  list(userId: string) { return firstValueFrom(this.client.send({ cmd: 'prefs.list' }, { userId })); }
  get(userId: string, key: string) { return firstValueFrom(this.client.send({ cmd: 'prefs.get' }, { userId, key })); }
  set(userId: string, key: string, value: any) { return firstValueFrom(this.client.send({ cmd: 'prefs.set' }, { userId, key, value })); }
  bulkGet(userId: string, keys: string[]) { return firstValueFrom(this.client.send({ cmd: 'prefs.bulk_get' }, { userId, keys })); }
  bulkSet(userId: string, entries: { key: string; value: any }[]) { return firstValueFrom(this.client.send({ cmd: 'prefs.bulk_set' }, { userId, entries })); }
  delete(userId: string, key: string) { return firstValueFrom(this.client.send({ cmd: 'prefs.delete' }, { userId, key })); }
  clear(userId: string) { return firstValueFrom(this.client.send({ cmd: 'prefs.clear' }, { userId })); }
}
