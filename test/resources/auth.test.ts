import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthResourceHandlers } from '../../src/resources/auth.js';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import { mockScreepsApiResponse, mockAuthMe, mockConfig, clearAllMocks } from '../helpers/mocks.js';

describe('Auth Resources', () => {
  let authHandlers: AuthResourceHandlers;
  let apiClient: ApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    clearAllMocks();
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    authHandlers = new AuthResourceHandlers(apiClient);
    global.fetch = jest.fn<typeof fetch>();
  });

  describe('handleAuthMe', () => {
    it('should fetch authenticated user info successfully', async () => {
      const mockData = mockAuthMe();
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const uri = new URL('screeps://auth/me');
      const result = await authHandlers.handleAuthMe(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('screeps://auth/me');
      expect(result.contents[0].text).toContain('test-user');
      expect(result.contents[0].text).toContain('user-123');
    });

    it('should handle authentication errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse({ error: 'Unauthorized' }, 401)
      );

      const uri = new URL('screeps://auth/me');
      const result = await authHandlers.handleAuthMe(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('error');
    });

    it('should include enhanced metadata', async () => {
      const mockData = mockAuthMe();
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const uri = new URL('screeps://auth/me');
      const result = await authHandlers.handleAuthMe(uri);

      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('Authentication Info');
    });
  });
});
