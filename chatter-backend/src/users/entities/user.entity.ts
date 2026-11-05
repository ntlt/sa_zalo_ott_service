import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

registerEnumType(UserStatus, { name: 'UserStatus' });

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  displayName: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field(() => UserStatus)
  status: UserStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
