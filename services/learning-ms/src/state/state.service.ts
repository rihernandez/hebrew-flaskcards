import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StateItem, StateItemDocument } from './schemas/state-item.schema';

const EXACT_KEYS = new Set([
  'favorites',
  'error_history',
  'traduccion_errors',
  'dictado_level_progress',
]);

const PREFIX_KEYS = ['activity_results_', 'seen_'];

const isAllowed = (key: string) =>
  EXACT_KEYS.has(key) || PREFIX_KEYS.some(prefix => key.startsWith(prefix));

@Injectable()
export class StateService {
  constructor(@InjectModel(StateItem.name) private readonly model: Model<StateItemDocument>) {}

  private assertAllowed(key: string) {
    if (!isAllowed(key)) {
      throw new BadRequestException(`Key not allowed in learning-ms: ${key}`);
    }
  }

  async list(userId: string) {
    const rows = await this.model.find({ userId }).select('key value updatedAt -_id').lean();
    return rows.filter(r => isAllowed(r.key));
  }

  async get(userId: string, key: string) {
    this.assertAllowed(key);
    const row = await this.model.findOne({ userId, key }).lean();
    return { key, value: row?.value ?? null };
  }

  async set(userId: string, key: string, value: any) {
    this.assertAllowed(key);
    await this.model.findOneAndUpdate({ userId, key }, { $set: { value } }, { upsert: true, new: true });
    return { ok: true };
  }

  async bulkGet(userId: string, keys: string[]) {
    keys.forEach(k => this.assertAllowed(k));
    const rows = await this.model.find({ userId, key: { $in: keys } }).select('key value -_id').lean();
    const map: Record<string, any> = {};
    keys.forEach(k => { map[k] = null; });
    rows.forEach(r => { map[r.key] = r.value; });
    return map;
  }

  async bulkSet(userId: string, entries: { key: string; value: any }[]) {
    entries.forEach(e => this.assertAllowed(e.key));
    if (entries.length === 0) return { ok: true, count: 0 };

    await this.model.bulkWrite(entries.map(e => ({
      updateOne: {
        filter: { userId, key: e.key },
        update: { $set: { value: e.value } },
        upsert: true,
      },
    })));

    return { ok: true, count: entries.length };
  }

  async delete(userId: string, key: string) {
    this.assertAllowed(key);
    await this.model.deleteOne({ userId, key });
    return { ok: true };
  }

  async clear(userId: string) {
    const rows = await this.model.find({ userId }).select('key').lean();
    const keys = rows.map(r => r.key).filter(k => isAllowed(k));
    if (keys.length === 0) return { ok: true, deleted: 0 };

    const res = await this.model.deleteMany({ userId, key: { $in: keys } });
    return { ok: true, deleted: res.deletedCount ?? 0 };
  }
}
