import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserToolHandlers } from '../../src/tools/user.js';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import { mockScreepsApiResponse, mockConfig, clearAllMocks } from '../helpers/mocks.js';

describe('User Tools', () => {
  let userHandlers: UserToolHandlers;
  let apiClient: ApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    clearAllMocks();
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    userHandlers = new UserToolHandlers(apiClient);
    global.fetch = jest.fn<typeof fetch>();
  });

  describe('handleGetUserName', () => {
    it('should get username from API', async () => {
      const mockData = {
        ok: 1,
        username: 'test-user',
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleGetUserName();

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('test-user');
    });

    it('should handle errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await userHandlers.handleGetUserName();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('handleGetUserStats', () => {
    it('should fetch user stats successfully', async () => {
      const mockData = {
        ok: 1,
        stats: {
          energyHarvested: 1000,
          energyControl: 500,
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleGetUserStats({ interval: '8' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('stats');
    });

    it('should handle errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await userHandlers.handleGetUserStats({ interval: '8' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('handleFindUser', () => {
    it('should find user by username', async () => {
      const mockData = {
        ok: 1,
        user: {
          _id: 'user-123',
          username: 'test-user',
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleFindUser({ username: 'test-user' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('test-user');
    });

    it('should find user by id', async () => {
      const mockData = {
        ok: 1,
        user: {
          _id: 'user-123',
          username: 'test-user',
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleFindUser({ id: 'user-123' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('user-123');
    });
  });

  describe('handleGetUserRooms', () => {
    it('should fetch user rooms with user ID directly', async () => {
      const mockData = {
        ok: 1,
        rooms: ['W7N3', 'W8N3'],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      // Use a valid 24-char hex ID
      const result = await userHandlers.handleGetUserRooms({ identifier: '6956c443a04dcb0012a2f404' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('rooms');
      // Should call rooms endpoint directly with the ID
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/rooms'),
        expect.any(Object)
      );
    });

    it('should auto-lookup user ID when given a username', async () => {
      // First call returns user lookup result
      const mockUserData = {
        ok: 1,
        user: {
          _id: '6956c443a04dcb0012a2f404',
          username: 'test-user',
        },
      };
      // Second call returns rooms data
      const mockRoomsData = {
        ok: 1,
        rooms: ['W7N3', 'W8N3'],
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockUserData))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockRoomsData));

      const result = await userHandlers.handleGetUserRooms({ identifier: 'test-user' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('rooms');
      // Should have called find first, then rooms
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/user/find'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/user/rooms'),
        expect.any(Object)
      );
    });

    it('should return error when username is not found', async () => {
      const mockUserData = {
        ok: 1,
        user: null,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockUserData)
      );

      const result = await userHandlers.handleGetUserRooms({ identifier: 'nonexistent-user' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("User 'nonexistent-user' not found");
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await userHandlers.handleGetUserRooms({ identifier: 'test-user' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('handleGetUserOverview', () => {
    it('should fetch user overview successfully', async () => {
      const mockData = {
        ok: 1,
        overview: {
          gcl: 5,
          energy: 100000,
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleGetUserOverview({});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('overview');
    });
  });

  describe('handleExecuteConsoleCommand', () => {
    it('should execute console command successfully', async () => {
      const mockData = {
        ok: 1,
        result: 'Command executed',
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleExecuteConsoleCommand({
        expression: 'console.log("test")',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('result');
    });
  });

  describe('handleGetUserMemory', () => {
    it('should fetch user memory successfully', async () => {
      const mockData = {
        ok: 1,
        data: { rooms: { W7N3: { level: 5 } } },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleGetUserMemory({});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('data');
    });

    it('should fetch memory with path', async () => {
      const mockData = {
        ok: 1,
        data: { level: 5 },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleGetUserMemory({ path: 'rooms.W7N3' });

      expect(result.isError).toBeFalsy();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('path=rooms.W7N3'),
        expect.any(Object)
      );
    });
  });

  describe('handleAuthSignin', () => {
    it('should sign in successfully', async () => {
      const mockData = {
        ok: 1,
        token: 'new-token-123',
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await userHandlers.handleAuthSignin({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('token');
    });
  });

  describe('getSchemas', () => {
    it('should return validation schemas', () => {
      const schemas = UserToolHandlers.getSchemas();

      expect(schemas).toHaveProperty('getUserName');
      expect(schemas).toHaveProperty('getUserStats');
      expect(schemas).toHaveProperty('getUserRooms');
      expect(schemas).toHaveProperty('findUser');
      expect(schemas).toHaveProperty('getUserOverview');
      expect(schemas).toHaveProperty('executeConsoleCommand');
      expect(schemas).toHaveProperty('getUserMemory');
      expect(schemas).toHaveProperty('authSignin');
    });
  });
});
