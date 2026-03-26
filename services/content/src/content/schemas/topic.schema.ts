import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TopicDocument = HydratedDocument<TopicRecord>;

@Schema({ timestamps: true, collection: 'content_topics' })
export class TopicRecord {
  @Prop({ required: true, trim: true, index: true })
  language: string;

  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({ required: true, min: 0, default: 0 })
  wordsCount: number;
}

export const TopicSchema = SchemaFactory.createForClass(TopicRecord);
TopicSchema.index({ language: 1, name: 1 }, { unique: true });
