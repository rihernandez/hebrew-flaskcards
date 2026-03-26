import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StateItemDocument = HydratedDocument<StateItem>;

@Schema({ timestamps: true })
export class StateItem {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  key: string;

  @Prop({ type: Object, default: null })
  value: any;
}

export const StateItemSchema = SchemaFactory.createForClass(StateItem);
StateItemSchema.index({ userId: 1, key: 1 }, { unique: true });
