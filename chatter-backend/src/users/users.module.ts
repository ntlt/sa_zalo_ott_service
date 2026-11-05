import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { UsersResolver } from './users.resolver.js';
import { UserRecord, UserSchema } from './schemas/user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRecord.name, schema: UserSchema },
    ]),
  ],
  providers: [UsersResolver, UsersService],
})
export class UsersModule {}
