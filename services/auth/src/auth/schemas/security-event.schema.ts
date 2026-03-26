import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SecurityEventDocument = HydratedDocument<SecurityEvent>;

@Schema({ timestamps: true, collection: 'auth_security_events' })
export class SecurityEvent {
  @Prop({ required: true, trim: true, index: true })
  type: string;

  @Prop({ trim: true, default: null })
  sourceService?: string | null;

  @Prop({ trim: true, default: null })
  ip?: string | null;

  @Prop({ trim: true, default: null })
  userAgent?: string | null;

  @Prop({ trim: true, default: null })
  path?: string | null;

  @Prop({ trim: true, default: null })
  reason?: string | null;

  @Prop({ trim: true, default: null, index: true })
  tokenHash?: string | null;
}

export const SecurityEventSchema = SchemaFactory.createForClass(SecurityEvent);
