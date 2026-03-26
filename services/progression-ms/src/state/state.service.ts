import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StateItem, StateItemDocument } from './schemas/state-item.schema';

const ALLOWED_KEYS = new Set([
  'streak_data',
  'achievements',
  'srs_data',
  'daily_challenge',
  'daily_challenge_history',
]);

@Injectable()
export class StateService {
  constructor(@InjectModel(StateItem.name) private readonly model: Model<StateItemDocument>) {}

  private assertAllowed(key: string) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new BadRequestException(`Key not allowed in progression-ms: ${key}`);
    }
  }

  async list(userId: string) {
    return this.model.find({ userId, key: { $in: [...ALLOWED_KEYS] } }).select('key value updatedAt -_id').lean();
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
    const keys = [...ALLOWED_KEYS];
    const res = await this.model.deleteMany({ userId, key: { $in: keys } });
    return { ok: true, deleted: res.deletedCount ?? 0 };
  }
}
