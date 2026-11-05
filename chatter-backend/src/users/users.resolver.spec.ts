import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserInput } from './dto/create-user.input.js';
import { UsersResolver } from './users.resolver.js';
import { UsersService } from './users.service.js';

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  const usersService = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    usersService.create.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    resolver = module.get<UsersResolver>(UsersResolver);
  });

  it('delegates account registration to the service', async () => {
    const input: CreateUserInput = {
      email: 'user@example.com',
      password: 'secure-password',
      displayName: 'Example User',
    };
    const createdUser = { id: 'user-id' };
    usersService.create.mockResolvedValue(createdUser);

    await expect(resolver.createUser(input)).resolves.toBe(createdUser);
    expect(usersService.create).toHaveBeenCalledWith(input);
  });
});
