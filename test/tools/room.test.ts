import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RoomToolHandlers } from '../../src/tools/room.js';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import {
  mockScreepsApiResponse,
  mockRoomTerrain,
  mockRoomObjects,
  mockRoomObjectsLarge,
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

  // Helper function to extract JSON data from tool result
  const extractJsonData = (resultText: string): any => {
    const dataMatch = resultText.match(/```json\n([\s\S]*?)\n```/);
    expect(dataMatch).toBeTruthy();
    return JSON.parse(dataMatch![1]);
  };

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

    it('should filter objects by type', async () => {
      const mockData = mockRoomObjectsLarge('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomObjects({ 
        room: 'W7N3',
        objectType: 'spawn'
      });

      expect(result.isError).toBeFalsy();
      const resultText = result.content[0].text;
      expect(resultText).toContain('W7N3');
      
      const data = extractJsonData(resultText);
      
      // Should only have spawn objects
      expect(data.objects).toHaveLength(25);
      data.objects.forEach((obj: any) => {
        expect(obj.type).toBe('spawn');
      });
      
      // Should have metadata
      expect(data._metadata).toBeDefined();
      expect(data._metadata.filteredObjects).toBe(25);
      expect(data._metadata.totalObjects).toBe(80);
    });

    it('should filter objects by multiple types', async () => {
      const mockData = mockRoomObjectsLarge('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomObjects({ 
        room: 'W7N3',
        objectType: 'spawn,tower'
      });

      expect(result.isError).toBeFalsy();
      const data = extractJsonData(result.content[0].text);
      
      // Should have 25 spawns + 15 towers = 40 objects
      expect(data.objects).toHaveLength(40);
      expect(data._metadata.filteredObjects).toBe(40);
    });

    it('should group objects by type', async () => {
      const mockData = mockRoomObjectsLarge('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomObjects({ 
        room: 'W7N3',
        groupByType: true
      });

      expect(result.isError).toBeFalsy();
      const resultText = result.content[0].text;
      expect(resultText).toContain('GROUPED BY TYPE');
      
      const data = extractJsonData(resultText);
      
      // Objects should be grouped
      expect(data.objects).toHaveProperty('spawn');
      expect(data.objects).toHaveProperty('extension');
      expect(data.objects).toHaveProperty('tower');
      expect(data.objects).toHaveProperty('creep');
      
      expect(data.objects.spawn).toHaveLength(25);
      expect(data.objects.extension).toHaveLength(30);
      expect(data.objects.tower).toHaveLength(15);
      expect(data.objects.creep).toHaveLength(10);
      
      // Should have metadata
      expect(data._metadata.groupedByType).toBe(true);
      expect(data._metadata.groupSummary).toHaveLength(4);
    });

    it('should paginate objects', async () => {
      const mockData = mockRoomObjectsLarge('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomObjects({ 
        room: 'W7N3',
        page: 1,
        pageSize: 20
      });

      expect(result.isError).toBeFalsy();
      const resultText = result.content[0].text;
      expect(resultText).toContain('PAGE 1 of 4');
      expect(resultText).toContain('NEXT PAGE: Call with page=2');
      
      const data = extractJsonData(resultText);
      
      // Should have exactly 20 objects
      expect(data.objects).toHaveLength(20);
      
      // Should have pagination metadata
      expect(data._metadata.pagination).toBeDefined();
      expect(data._metadata.pagination.page).toBe(1);
      expect(data._metadata.pagination.pageSize).toBe(20);
      expect(data._metadata.pagination.totalPages).toBe(4);
      expect(data._metadata.pagination.hasNextPage).toBe(true);
      expect(data._metadata.pagination.hasPreviousPage).toBe(false);
    });

    it('should paginate to second page', async () => {
      const mockData = mockRoomObjectsLarge('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomObjects({ 
        room: 'W7N3',
        page: 2,
        pageSize: 20
      });

      expect(result.isError).toBeFalsy();
      const resultText = result.content[0].text;
      expect(resultText).toContain('PAGE 2 of 4');
      expect(resultText).toContain('NEXT PAGE: Call with page=3');
      expect(resultText).toContain('PREVIOUS PAGE: Call with page=1');
      
      const data = extractJsonData(resultText);
      
      expect(data.objects).toHaveLength(20);
      expect(data._metadata.pagination.hasNextPage).toBe(true);
      expect(data._metadata.pagination.hasPreviousPage).toBe(true);
    });

    it('should paginate to last page', async () => {
      const mockData = mockRoomObjectsLarge('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomObjects({ 
        room: 'W7N3',
        page: 4,
        pageSize: 20
      });

      expect(result.isError).toBeFalsy();
      const resultText = result.content[0].text;
      expect(resultText).toContain('PAGE 4 of 4');
      expect(resultText).toContain('LAST PAGE: All objects have been retrieved');
      expect(resultText).toContain('PREVIOUS PAGE: Call with page=3');
      expect(resultText).not.toContain('NEXT PAGE');
      
      const data = extractJsonData(resultText);
      
      expect(data.objects).toHaveLength(20);
      expect(data._metadata.pagination.hasNextPage).toBe(false);
      expect(data._metadata.pagination.hasPreviousPage).toBe(true);
    });

    it('should combine filtering and pagination', async () => {
      const mockData = mockRoomObjectsLarge('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await roomHandlers.handleGetRoomObjects({ 
        room: 'W7N3',
        objectType: 'extension',
        page: 1,
        pageSize: 10
      });

      expect(result.isError).toBeFalsy();
      const data = extractJsonData(result.content[0].text);
      
      // Should have 10 extensions (page 1 of filtered 30 extensions)
      expect(data.objects).toHaveLength(10);
      data.objects.forEach((obj: any) => {
        expect(obj.type).toBe('extension');
      });
      
      expect(data._metadata.pagination.totalPages).toBe(3);
      expect(data._metadata.filteredObjects).toBe(30);
      expect(data._metadata.totalObjects).toBe(80);
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
