import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MarketToolHandlers } from '../../src/tools/market.js';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import { mockScreepsApiResponse, mockConfig, clearAllMocks } from '../helpers/mocks.js';

describe('Market Tools', () => {
  let marketHandlers: MarketToolHandlers;
  let apiClient: ApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    clearAllMocks();
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    marketHandlers = new MarketToolHandlers(apiClient);
    global.fetch = jest.fn<typeof fetch>();
  });

  describe('handleGetMarketOrdersIndex', () => {
    it('should fetch market orders index successfully', async () => {
      const mockData = {
        ok: 1,
        list: [
          { resourceType: 'energy', count: 100 },
          { resourceType: 'power', count: 50 },
        ],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await marketHandlers.handleGetMarketOrdersIndex();

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('list');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      await expect(marketHandlers.handleGetMarketOrdersIndex()).rejects.toThrow();
    });
  });

  describe('handleGetMyMarketOrders', () => {
    it('should fetch user market orders successfully', async () => {
      const mockData = {
        ok: 1,
        list: [
          { _id: 'order-1', type: 'sell', resourceType: 'energy', price: 1.5 },
        ],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await marketHandlers.handleGetMyMarketOrders();

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('list');
    });
  });

  describe('handleGetMarketOrders', () => {
    it('should fetch market orders for resource successfully', async () => {
      const mockData = {
        ok: 1,
        list: [
          { _id: 'order-1', type: 'sell', resourceType: 'energy', price: 1.5 },
          { _id: 'order-2', type: 'buy', resourceType: 'energy', price: 1.2 },
        ],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await marketHandlers.handleGetMarketOrders({ resourceType: 'energy' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('energy');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('resourceType=energy'),
        expect.any(Object)
      );
    });
  });

  describe('handleGetMoneyHistory', () => {
    it('should fetch money history successfully', async () => {
      const mockData = {
        ok: 1,
        list: [
          { date: '2024-01-01', change: 1000, balance: 10000 },
          { date: '2024-01-02', change: -500, balance: 9500 },
        ],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await marketHandlers.handleGetMoneyHistory({});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('list');
    });

    it('should handle pagination', async () => {
      const mockData = {
        ok: 1,
        list: [],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await marketHandlers.handleGetMoneyHistory({ page: 2 });

      expect(result.isError).toBeFalsy();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  describe('handleGetMapStats', () => {
    it('should fetch map stats successfully', async () => {
      const mockData = {
        ok: 1,
        stats: {
          W7N3: { energyHarvested: [100, 150, 200] },
          W8N3: { energyHarvested: [80, 120, 180] },
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await marketHandlers.handleGetMapStats({
        rooms: ['W7N3', 'W8N3'],
        statName: 'energyHarvested',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('stats');
      expect(result.content[0].text).toContain('W7N3');
    });
  });

  describe('getSchemas', () => {
    it('should return validation schemas', () => {
      const schemas = MarketToolHandlers.getSchemas();

      expect(schemas).toHaveProperty('getMarketOrdersIndex');
      expect(schemas).toHaveProperty('getMyMarketOrders');
      expect(schemas).toHaveProperty('getMarketOrders');
      expect(schemas).toHaveProperty('getMoneyHistory');
      expect(schemas).toHaveProperty('getMapStats');
    });
  });
});
