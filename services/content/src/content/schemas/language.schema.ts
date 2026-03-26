import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LanguageDocument = HydratedDocument<LanguageRecord>;

@Schema({ timestamps: true, collection: 'content_languages' })
export class LanguageRecord {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ required: true, min: 0, default: 0 })
  wordsCount: number;

  @Prop({ required: true, min: 0, default: 0 })
  topicsCount: number;
}

export const LanguageSchema = SchemaFactory.createForClass(LanguageRecord);
