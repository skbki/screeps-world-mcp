import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import { mockScreepsApiResponse, mockConfig, clearAllMocks } from '../helpers/mocks.js';
import { ScreepsApiError, RateLimitError, AuthenticationError } from '../../src/utils/errors.js';

describe('API Client', () => {
  let apiClient: ApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    clearAllMocks();
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    global.fetch = jest.fn<typeof fetch>();
  });

  describe('makeApiCall', () => {
    it('should make successful API call', async () => {
      const mockData = { ok: 1, data: 'success' };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await apiClient.makeApiCall('/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://screeps.com/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Token': 'test-token-123',
            'X-Username': 'test-user',
          }),
        })
      );
    });

    it('should throw ScreepsApiError on HTTP error response', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse({ error: 'Not found' }, 404)
      );

      await expect(apiClient.makeApiCall('/test-404')).rejects.toThrow(ScreepsApiError);
      
      try {
        await apiClient.makeApiCall('/test-404');
      } catch (error) {
        expect(error).toBeInstanceOf(ScreepsApiError);
        expect((error as ScreepsApiError).message).toContain('HTTP 404');
        expect((error as ScreepsApiError).statusCode).toBe(404);
        expect((error as ScreepsApiError).code).toBe('HTTP_ERROR');
      }
    });

    it('should throw RateLimitError on 429 response', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse({ error: 'Rate limit' }, 429, {
          remaining: 0,
          limit: 100,
          reset: Math.floor(Date.now() / 1000) + 60,
        })
      );

      await expect(apiClient.makeApiCall('/test-429')).rejects.toThrow(RateLimitError);
      
      try {
        await apiClient.makeApiCall('/test-429');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).message).toContain('Rate limit exceeded');
        expect((error as RateLimitError).statusCode).toBe(429);
        expect((error as RateLimitError).code).toBe('RATE_LIMITED');
      }
    });

    it('should throw AuthenticationError on 401 response', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse({ error: 'Unauthorized' }, 401)
      );

      await expect(apiClient.makeApiCall('/test-401')).rejects.toThrow(AuthenticationError);
      
      try {
        await apiClient.makeApiCall('/test-401');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).statusCode).toBe(401);
        expect((error as AuthenticationError).code).toBe('AUTH_FAILED');
      }
    });
  });

  describe('buildQueryParams', () => {
    it('should build query params from object', () => {
      const params = apiClient.buildQueryParams({
        room: 'W7N3',
        shard: 'shard0',
      });

      expect(params.toString()).toBe('room=W7N3&shard=shard0');
    });

    it('should skip undefined and null values', () => {
      const params = apiClient.buildQueryParams({
        room: 'W7N3',
        shard: undefined,
        encoded: null,
      });

      expect(params.toString()).toBe('room=W7N3');
    });
  });

  describe('buildEndpointWithQuery', () => {
    it('should build endpoint with query string', () => {
      const endpoint = apiClient.buildEndpointWithQuery('/game/room-terrain', {
        room: 'W7N3',
        shard: 'shard0',
      });

      expect(endpoint).toBe('/game/room-terrain?room=W7N3&shard=shard0');
    });

    it('should return base endpoint when no params', () => {
      const endpoint = apiClient.buildEndpointWithQuery('/game/room-terrain', {});

      expect(endpoint).toBe('/game/room-terrain');
    });
  });

  describe('createToolResult', () => {
    it('should create tool result', () => {
      const result = apiClient.createToolResult('Test result');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test result',
          },
        ],
        isError: false,
      });
    });

    it('should create error tool result', () => {
      const result = apiClient.createToolResult('Error message', true);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error message',
          },
        ],
        isError: true,
      });
    });
  });

  describe('createResourceContent', () => {
    it('should create resource content', () => {
      const data = { test: 'data' };
      const result = apiClient.createResourceContent('screeps://test', data);

      expect(result).toEqual({
        contents: [
          {
            uri: 'screeps://test',
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      });
    });
  });

  describe('createErrorResourceContent', () => {
    it('should create error resource content from Error', () => {
      const error = new Error('Test error');
      const result = apiClient.createErrorResourceContent('screeps://test', error);

      expect(result).toEqual({
        contents: [
          {
            uri: 'screeps://test',
            mimeType: 'application/json',
            text: expect.stringContaining('Test error'),
          },
        ],
      });
    });

    it('should create error resource content from string', () => {
      const result = apiClient.createErrorResourceContent('screeps://test', 'String error');

      expect(result).toEqual({
        contents: [
          {
            uri: 'screeps://test',
            mimeType: 'application/json',
            text: expect.stringContaining('String error'),
          },
        ],
      });
    });
  });

  describe('createEnhancedToolResult', () => {
    it('should create enhanced tool result with metadata', async () => {
      const mockData = { ok: 1, data: 'success' };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData, 200, {
          remaining: 95,
          limit: 100,
          reset: Math.floor(Date.now() / 1000) + 60,
        })
      );

      // Make a call to populate rate limit info
      await apiClient.makeApiCall('/test');

      const result = apiClient.createEnhancedToolResult(
        mockData,
        '/test',
        'Test Description',
        false
      );

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Description');
      expect(result.content[0].text).toContain('Rate Limit Status');
      expect(result.isError).toBe(false);
    });
  });
});
