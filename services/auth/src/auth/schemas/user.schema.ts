import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum LanguageLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, min: 1, max: 120 })
  age: number;

  @Prop({ required: true, trim: true })
  country: string;

  @Prop({ required: true, trim: true })
  nativeLanguage: string;

  @Prop({ required: true, trim: true })
  learningLanguage: string;

  @Prop({ required: true, enum: LanguageLevel, default: LanguageLevel.BEGINNER })
  languageLevel: LanguageLevel;

  @Prop({ default: null })
  photo: string;

  @Prop({ default: 20, min: -1, max: 23 })
  notificationHour: number;

  @Prop({ default: 0, min: 0, max: 59 })
  notificationMinute: number;

  @Prop({ default: false })
  speakingUnlocked: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop({ default: null })
  temporaryPasswordIssuedAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
