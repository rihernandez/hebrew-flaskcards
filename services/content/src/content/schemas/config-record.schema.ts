import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ConfigRecordDocument = HydratedDocument<ConfigRecord>;

@Schema({ timestamps: true, collection: 'content_config_records' })
export class ConfigRecord {
  @Prop({ required: true, trim: true, index: true })
  source: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload: Record<string, unknown>;
}

export const ConfigRecordSchema = SchemaFactory.createForClass(ConfigRecord);
