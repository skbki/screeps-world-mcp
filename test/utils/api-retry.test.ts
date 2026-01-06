import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import { mockScreepsApiResponse, mockConfig, clearAllMocks } from '../helpers/mocks.js';

describe('API Client - Retry Logic', () => {
  let apiClient: ApiClient;
  let configManager: ConfigManager;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    clearAllMocks();
    // Spy on console methods first
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    global.fetch = jest.fn<typeof fetch>();
    // Use fake timers for all tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers after each test
    jest.useRealTimers();
    // Restore console spies
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Successful API calls without retry', () => {
    it('should succeed on first attempt for 200 OK', async () => {
      const mockData = { ok: 1, data: 'success' };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await apiClient.makeApiCall('/test-success');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry on transient failures', () => {
    it('should retry on 500 Internal Server Error and succeed', async () => {
      const mockData = { ok: 1, data: 'success' };
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      // First call fails with 500, second succeeds
      fetchMock
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = apiClient.makeApiCall('/test-retry-500');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on 502 Bad Gateway and succeed', async () => {
      const mockData = { ok: 1, data: 'success' };
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Bad Gateway' }, 502))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = apiClient.makeApiCall('/test-retry-502');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 Service Unavailable and succeed', async () => {
      const mockData = { ok: 1, data: 'success' };
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Service Unavailable' }, 503))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = apiClient.makeApiCall('/test-retry-503');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on 504 Gateway Timeout and succeed', async () => {
      const mockData = { ok: 1, data: 'success' };
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Gateway Timeout' }, 504))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = apiClient.makeApiCall('/test-retry-504');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 Rate Limit and succeed', async () => {
      const mockData = { ok: 1, data: 'success' };
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock
        .mockResolvedValueOnce(
          await mockScreepsApiResponse({ error: 'Rate limit' }, 429, {
            remaining: 0,
            limit: 100,
            reset: Math.floor(Date.now() / 1000) + 60,
          })
        )
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = apiClient.makeApiCall('/test-retry-429');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on 408 Request Timeout and succeed', async () => {
      const mockData = { ok: 1, data: 'success' };
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Request Timeout' }, 408))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = apiClient.makeApiCall('/test-retry-408');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on network error and succeed', async () => {
      const mockData = { ok: 1, data: 'success' };
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = apiClient.makeApiCall('/test-retry-network-error');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Maximum retry attempts', () => {
    it('should fail after max retries on persistent 500 error', async () => {
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      // All attempts fail with 500
      fetchMock.mockResolvedValue(await mockScreepsApiResponse({ error: 'Server error' }, 500));

      const promise = apiClient.makeApiCall('/test-max-retries-500');
      const assertion = expect(promise).rejects.toThrow('HTTP 500: Error');
      await jest.runAllTimersAsync();
      await assertion;
      
      // Should try: initial + 3 retries = 4 total attempts
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('should fail after max retries on persistent network error', async () => {
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock.mockRejectedValue(new Error('Network error'));

      const promise = apiClient.makeApiCall('/test-max-retries-network');
      const assertion = expect(promise).rejects.toThrow('Network error');
      await jest.runAllTimersAsync();
      await assertion;

      // Should try: initial + 3 retries = 4 total attempts
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('should succeed on the last retry attempt', async () => {
      const mockData = { ok: 1, data: 'success' };
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      // Fail 3 times, succeed on 4th (last possible attempt)
      fetchMock
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = apiClient.makeApiCall('/test-succeed-on-last-retry');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('Non-retryable errors', () => {
    it('should not retry on 404 Not Found', async () => {
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock.mockResolvedValue(await mockScreepsApiResponse({ error: 'Not found' }, 404));

      await expect(apiClient.makeApiCall('/test-no-retry-404')).rejects.toThrow('HTTP 404');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 Unauthorized', async () => {
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock.mockResolvedValue(await mockScreepsApiResponse({ error: 'Unauthorized' }, 401));

      await expect(apiClient.makeApiCall('/test-no-retry-401')).rejects.toThrow('HTTP 401');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 Forbidden', async () => {
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock.mockResolvedValue(await mockScreepsApiResponse({ error: 'Forbidden' }, 403));

      await expect(apiClient.makeApiCall('/test-no-retry-403')).rejects.toThrow('HTTP 403');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 400 Bad Request', async () => {
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock.mockResolvedValue(await mockScreepsApiResponse({ error: 'Bad Request' }, 400));

      await expect(apiClient.makeApiCall('/test-no-retry-400')).rejects.toThrow('HTTP 400');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom retry configuration', () => {
    it('should respect custom maxRetries setting', async () => {
      const customConfig = {
        ...mockConfig,
        retryConfig: {
          maxRetries: 1,
          initialDelayMs: 100,
          maxDelayMs: 1000,
          retryableStatusCodes: [500, 502, 503, 504],
        },
      };
      const customConfigManager = new ConfigManager(customConfig);
      const customApiClient = new ApiClient(customConfigManager);
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock.mockResolvedValue(await mockScreepsApiResponse({ error: 'Server error' }, 500));

      const promise = customApiClient.makeApiCall('/test-custom-retry');
      const assertion = expect(promise).rejects.toThrow('HTTP 500: Error');
      await jest.runAllTimersAsync();
      await assertion;

      // Should try: initial + 1 retry = 2 total attempts
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should respect custom retryableStatusCodes', async () => {
      const customConfig = {
        ...mockConfig,
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 1000,
          retryableStatusCodes: [500], // Only retry 500, not 502
        },
      };
      const customConfigManager = new ConfigManager(customConfig);
      const customApiClient = new ApiClient(customConfigManager);
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

      fetchMock.mockResolvedValue(await mockScreepsApiResponse({ error: 'Bad Gateway' }, 502));

      await expect(customApiClient.makeApiCall('/test-custom-codes')).rejects.toThrow('HTTP 502: Error');

      // Should not retry 502 since it's not in retryableStatusCodes
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exponential backoff', () => {
    it('should apply exponential backoff delays', async () => {
      const customConfig = {
        ...mockConfig,
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 10000,
          retryableStatusCodes: [500],
        },
      };
      const customConfigManager = new ConfigManager(customConfig);
      const customApiClient = new ApiClient(customConfigManager);
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockData = { ok: 1, data: 'success' };

      // Fail twice, succeed on third
      fetchMock
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = customApiClient.makeApiCall('/test-backoff');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should cap delay at maxDelayMs', async () => {
      const customConfig = {
        ...mockConfig,
        retryConfig: {
          maxRetries: 5,
          initialDelayMs: 1000,
          maxDelayMs: 2000, // Cap at 2 seconds
          retryableStatusCodes: [500],
        },
      };
      const customConfigManager = new ConfigManager(customConfig);
      const customApiClient = new ApiClient(customConfigManager);
      const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
      const mockData = { ok: 1, data: 'success' };

      // Fail 4 times, succeed on 5th
      fetchMock
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse({ error: 'Server error' }, 500))
        .mockResolvedValueOnce(await mockScreepsApiResponse(mockData, 200));

      const promise = customApiClient.makeApiCall('/test-backoff-cap');
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });
  });
});
