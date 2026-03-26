import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WordDocument = HydratedDocument<Word>;

@Schema({ timestamps: true })
export class Word {
  @Prop({ required: true, trim: true })
  word: string;

  @Prop({ required: true, trim: true })
  pronunciation: string;

  @Prop({ required: true, trim: true })
  meaning: string;

  @Prop({ type: [String], default: [] })
  examples: string[];

  @Prop({ required: true, trim: true, index: true })
  language: string;

  @Prop({ required: true, trim: true, index: true })
  topic: string;

  @Prop({ trim: true, default: null })
  category?: string | null;

  @Prop({ trim: true, default: null })
  genre?: string | null;
}

export const WordSchema = SchemaFactory.createForClass(Word);
WordSchema.index({ language: 1, topic: 1, word: 1 });
