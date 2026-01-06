import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GameResourceHandlers } from '../../src/resources/game.js';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import {
  mockScreepsApiResponse,
  mockGameTime,
  mockWorldSize,
  mockShardsInfo,
  mockConfig,
  clearAllMocks,
} from '../helpers/mocks.js';

describe('Game Resources', () => {
  let gameHandlers: GameResourceHandlers;
  let apiClient: ApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    clearAllMocks();
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    gameHandlers = new GameResourceHandlers(apiClient);
    global.fetch = jest.fn<typeof fetch>();
  });

  describe('handleGameTime', () => {
    it('should fetch game time successfully', async () => {
      const mockData = mockGameTime();
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const uri = new URL('screeps://game/time');
      const result = await gameHandlers.handleGameTime(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('screeps://game/time');
      expect(result.contents[0].text).toContain('time');
    });

    it('should handle errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const uri = new URL('screeps://game/time');
      const result = await gameHandlers.handleGameTime(uri);

      expect(result.contents[0].text).toContain('error');
    });
  });

  describe('handleWorldSize', () => {
    it('should fetch world size successfully', async () => {
      const mockData = mockWorldSize();
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const uri = new URL('screeps://game/world-size');
      const result = await gameHandlers.handleWorldSize(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('width');
      expect(result.contents[0].text).toContain('202');
    });
  });

  describe('handleShardsInfo', () => {
    it('should fetch shards info successfully', async () => {
      const mockData = mockShardsInfo();
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const uri = new URL('screeps://game/shards/info');
      const result = await gameHandlers.handleShardsInfo(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('shards');
      expect(result.contents[0].text).toContain('shard0');
    });
  });

  describe('handleMarketStats', () => {
    it('should fetch market stats successfully', async () => {
      const mockData = {
        ok: 1,
        credits: 100000,
        num: 50,
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const uri = new URL('screeps://game/market/stats');
      const result = await gameHandlers.handleMarketStats(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('credits');
    });
  });

  describe('handleVersion', () => {
    it('should fetch version info successfully', async () => {
      const mockData = {
        ok: 1,
        serverData: {
          version: '5.0.0',
          users: 50000,
        },
        features: ['seasons', 'pvp'],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const uri = new URL('screeps://version');
      const result = await gameHandlers.handleVersion(uri);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].text).toContain('version');
    });
  });
});
