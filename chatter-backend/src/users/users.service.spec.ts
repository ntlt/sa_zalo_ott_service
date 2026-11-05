import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { UserRecord } from './schemas/user.schema.js';

class MockUserModel {
  static saveMock = vi.fn();

  constructor(private readonly data: Record<string, unknown>) {}

  save() {
    return MockUserModel.saveMock(this.data);
  }
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    MockUserModel.saveMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(UserRecord.name), useValue: MockUserModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates an active account with a normalized email and a salted password hash', async () => {
    const now = new Date();
    MockUserModel.saveMock.mockImplementation(async (data) => ({
      ...data,
      id: 'user-id',
      createdAt: now,
      updatedAt: now,
    }));

    const user = await service.create({
      email: '  USER@example.com ',
      password: 'secure-password',
      displayName: '  Example User ',
    });

    expect(user).toMatchObject({
      id: 'user-id',
      email: 'user@example.com',
      displayName: 'Example User',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    expect(user).not.toHaveProperty('passwordHash');

    const savedData = MockUserModel.saveMock.mock.calls[0][0];
    expect(savedData.passwordHash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(savedData.passwordHash).not.toContain('secure-password');
  });

  it.each([
    {
      input: {
        email: 'not-an-email',
        password: 'secure-password',
        displayName: 'Example User',
      },
      message: 'A valid email address is required.',
    },
    {
      input: {
        email: 'user@example.com',
        password: 'short',
        displayName: 'Example User',
      },
      message: 'Password must contain between 8 and 128 characters.',
    },
    {
      input: {
        email: 'user@example.com',
        password: 'secure-password',
        displayName: '   ',
      },
      message: 'Display name must contain between 1 and 80 characters.',
    },
  ])('rejects invalid registration data', async ({ input, message }) => {
    await expect(service.create(input)).rejects.toThrow(
      new BadRequestException(message),
    );
    expect(MockUserModel.saveMock).not.toHaveBeenCalled();
  });

  it('translates duplicate email errors into a conflict', async () => {
    MockUserModel.saveMock.mockRejectedValue({ code: 11000 });

    await expect(
      service.create({
        email: 'user@example.com',
        password: 'secure-password',
        displayName: 'Example User',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
