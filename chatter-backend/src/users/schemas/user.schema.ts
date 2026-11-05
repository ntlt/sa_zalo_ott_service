import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { UserStatus } from '../entities/user.entity.js';

@Schema({ timestamps: true, collection: 'users' })
export class UserRecord {
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  displayName: string;

  @Prop({ trim: true, default: null })
  avatarUrl?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  createdAt: Date;

  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserRecord);
