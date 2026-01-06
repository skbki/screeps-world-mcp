import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RoomToolHandlers } from '../../src/tools/room.js';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import {
  mockScreepsApiResponse,
  mockRoomTerrain,
  mockRoomObjects,
  mockConfig,
  clearAllMocks,
} from '../helpers/mocks.js';

describe('Room Tools', () => {
  let roomHandlers: RoomToolHandlers;
  let apiClient: ApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    clearAllMocks();
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    roomHandlers = new RoomToolHandlers(apiClient);
    global.fetch = jest.fn<typeof fetch>();
  });

  describe('handleGetRoomTerrain', () => {
    it('should fetch room terrain successfully', async () => {
      const mockData = mockRoomTerrain('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomTerrain({ room: 'W7N3' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('W7N3');
      expect(result.content[0].text).toContain('terrain');
    });

    it('should handle terrain fetch with shard parameter', async () => {
      const mockData = mockRoomTerrain('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomTerrain({
        room: 'W7N3',
        shard: 'shard1',
      });

      expect(result.isError).toBeFalsy();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('shard=shard1'),
        expect.any(Object)
      );
    });

    it('should handle errors gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await roomHandlers.handleGetRoomTerrain({ room: 'W7N3' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting room terrain');
    });
  });

  describe('handleGetRoomObjects', () => {
    it('should fetch room objects successfully', async () => {
      const mockData = mockRoomObjects('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomObjects({ room: 'W7N3' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('W7N3');
      expect(result.content[0].text).toContain('objects');
    });

    it('should handle loop detection error', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('LOOP DETECTED: Repeated calls')
      );

      const result = await roomHandlers.handleGetRoomObjects({ room: 'W7N3' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('LOOP DETECTED');
      expect(result.content[0].text).toContain('CRITICAL ERROR');
    });

    it('should handle regular errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await roomHandlers.handleGetRoomObjects({ room: 'W7N3' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error getting room objects');
    });
  });

  describe('handleGetRoomOverview', () => {
    it('should fetch room overview successfully', async () => {
      const mockData = {
        ok: 1,
        stats: {
          energyHarvested: [100, 150, 200],
          energyControl: [50, 60, 70],
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomOverview({ room: 'W7N3' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('W7N3');
    });

    it('should handle interval parameter', async () => {
      const mockData = { ok: 1, stats: {} };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomOverview({
        room: 'W7N3',
        interval: '180',
      });

      expect(result.isError).toBeFalsy();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('interval=180'),
        expect.any(Object)
      );
    });
  });

  describe('handleGetRoomStatus', () => {
    it('should fetch room status successfully', async () => {
      const mockData = {
        ok: 1,
        status: 'normal',
        type: 'out',
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomStatus({ room: 'W7N3' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('W7N3');
      expect(result.content[0].text).toContain('status');
    });
  });

  describe('handleCalculateDistance', () => {
    it('should calculate distance between rooms', async () => {
      const result = await roomHandlers.handleCalculateDistance({
        from: 'W7N3',
        to: 'W10N5',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('W7N3');
      expect(result.content[0].text).toContain('W10N5');
      expect(result.content[0].text).toContain('chebyshevDistance');
      expect(result.content[0].text).toContain('manhattanDistance');
    });

    it('should calculate correct Chebyshev distance', async () => {
      const result = await roomHandlers.handleCalculateDistance({
        from: 'W0N0',
        to: 'W3N4',
      });

      expect(result.isError).toBeFalsy();
      // Chebyshev distance should be max(3, 4) = 4
      expect(result.content[0].text).toContain('"chebyshevDistance": 4');
    });

    it('should handle East/West and North/South coordinates', async () => {
      const result = await roomHandlers.handleCalculateDistance({
        from: 'E5N10',
        to: 'E8N7',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('deltaX');
      expect(result.content[0].text).toContain('deltaY');
    });

    it('should handle invalid room names', async () => {
      const result = await roomHandlers.handleCalculateDistance({
        from: 'invalid',
        to: 'W7N3',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error calculating distance');
    });
  });

  describe('getSchemas', () => {
    it('should return validation schemas', () => {
      const schemas = RoomToolHandlers.getSchemas();

      expect(schemas).toHaveProperty('roomTerrain');
      expect(schemas).toHaveProperty('roomObjects');
      expect(schemas).toHaveProperty('roomOverview');
      expect(schemas).toHaveProperty('roomStatus');
      expect(schemas).toHaveProperty('calculateDistance');
    });
  });
});
