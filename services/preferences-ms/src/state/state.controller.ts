import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StateService } from './state.service';

@Controller()
export class StateController {
  constructor(private readonly service: StateService) {}

  @MessagePattern({ cmd: 'prefs.list' })
  list(@Payload() data: { userId: string }) {
    return this.service.list(data.userId);
  }

  @MessagePattern({ cmd: 'prefs.get' })
  get(@Payload() data: { userId: string; key: string }) {
    return this.service.get(data.userId, data.key);
  }

  @MessagePattern({ cmd: 'prefs.set' })
  set(@Payload() data: { userId: string; key: string; value: any }) {
    return this.service.set(data.userId, data.key, data.value);
  }

  @MessagePattern({ cmd: 'prefs.bulk_get' })
  bulkGet(@Payload() data: { userId: string; keys: string[] }) {
    return this.service.bulkGet(data.userId, data.keys ?? []);
  }

  @MessagePattern({ cmd: 'prefs.bulk_set' })
  bulkSet(@Payload() data: { userId: string; entries: { key: string; value: any }[] }) {
    return this.service.bulkSet(data.userId, data.entries ?? []);
  }

  @MessagePattern({ cmd: 'prefs.delete' })
  delete(@Payload() data: { userId: string; key: string }) {
    return this.service.delete(data.userId, data.key);
  }

  @MessagePattern({ cmd: 'prefs.clear' })
  clear(@Payload() data: { userId: string }) {
    return this.service.clear(data.userId);
  }
}
