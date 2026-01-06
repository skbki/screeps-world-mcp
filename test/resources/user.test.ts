import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserResourceHandlers } from '../../src/resources/user.js';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import { mockScreepsApiResponse, mockConfig, clearAllMocks } from '../helpers/mocks.js';

describe('User Resources', () => {
  let userHandlers: UserResourceHandlers;
  let apiClient: ApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    clearAllMocks();
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    userHandlers = new UserResourceHandlers(apiClient);
    global.fetch = jest.fn<typeof fetch>();
  });

  describe('handleUserWorldStatus', () => {
    it('should fetch user world status successfully', async () => {
      const mockData = {
        ok: 1,
        status: 'normal',
        rooms: 5,
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const uri = new URL('screeps://user/world-status');
      const result = await userHandlers.handleUserWorldStatus(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('screeps://user/world-status');
      expect(result.contents[0].text).toContain('status');
    });

    it('should handle errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const uri = new URL('screeps://user/world-status');
      const result = await userHandlers.handleUserWorldStatus(uri);

      expect(result.contents[0].text).toContain('error');
    });
  });
});
