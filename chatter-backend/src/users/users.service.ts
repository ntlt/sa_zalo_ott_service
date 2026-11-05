import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { Model } from 'mongoose';
import { CreateUserInput } from './dto/create-user.input.js';
import { User, UserStatus } from './entities/user.entity.js';
import { UserRecord } from './schemas/user.schema.js';

const PASSWORD_HASH_BYTES = 64;

const derivePasswordHash = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(password, salt, PASSWORD_HASH_BYTES, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserRecord.name)
    private readonly userModel: Model<UserRecord>,
  ) {}

  async create(createUserInput: CreateUserInput): Promise<User> {
    const email = createUserInput.email.trim().toLowerCase();
    const displayName = createUserInput.displayName.trim();
    const password = createUserInput.password;

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new BadRequestException('A valid email address is required.');
    }

    if (password.length < 8 || password.length > 128) {
      throw new BadRequestException(
        'Password must contain between 8 and 128 characters.',
      );
    }

    if (displayName.length === 0 || displayName.length > 80) {
      throw new BadRequestException(
        'Display name must contain between 1 and 80 characters.',
      );
    }

    const salt = randomBytes(16).toString('hex');
    const derivedKey = await derivePasswordHash(password, salt);
    const passwordHash = `scrypt$${salt}$${derivedKey.toString('hex')}`;

    try {
      const user = new this.userModel({
        email,
        passwordHash,
        displayName,
        avatarUrl: createUserInput.avatarUrl?.trim() || null,
        status: UserStatus.ACTIVE,
      });
      const savedUser = await user.save();

      return {
        id: savedUser.id,
        email: savedUser.email,
        displayName: savedUser.displayName,
        avatarUrl: savedUser.avatarUrl ?? undefined,
        status: savedUser.status,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }

      throw error;
    }
  }
}
