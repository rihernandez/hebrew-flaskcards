import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StateItem, StateItemDocument } from './schemas/state-item.schema';

@Injectable()
export class StateService {
  constructor(
    @InjectModel(StateItem.name) private stateModel: Model<StateItemDocument>,
  ) {}

  async list(userId: string) {
    const rows = await this.stateModel.find({ userId }).select('key value updatedAt -_id').lean();
    return rows;
  }

  async get(userId: string, key: string) {
    const row = await this.stateModel.findOne({ userId, key }).lean();
    return row ? row.value : null;
  }

  async upsert(userId: string, key: string, value: any) {
    await this.stateModel.findOneAndUpdate(
      { userId, key },
      { $set: { value } },
      { upsert: true, new: true },
    );
    return { ok: true };
  }

  async bulkGet(userId: string, keys: string[]) {
    const rows = await this.stateModel.find({ userId, key: { $in: keys } }).select('key value -_id').lean();
    const map: Record<string, any> = {};
    keys.forEach(k => { map[k] = null; });
    rows.forEach(r => { map[r.key] = r.value; });
    return map;
  }

  async bulkSet(userId: string, entries: { key: string; value: any }[]) {
    if (entries.length === 0) return { ok: true, count: 0 };

    const ops = entries.map((entry) => ({
      updateOne: {
        filter: { userId, key: entry.key },
        update: { $set: { value: entry.value } },
        upsert: true,
      },
    }));

    await this.stateModel.bulkWrite(ops);
    return { ok: true, count: entries.length };
  }

  async remove(userId: string, key: string) {
    await this.stateModel.deleteOne({ userId, key });
    return { ok: true };
  }

  async clear(userId: string) {
    const res = await this.stateModel.deleteMany({ userId });
    return { ok: true, deleted: res.deletedCount ?? 0 };
  }
}
