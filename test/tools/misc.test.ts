import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MiscToolHandlers } from '../../src/tools/misc.js';
import { ApiClient } from '../../src/utils/api.js';
import { ConfigManager } from '../../src/config/index.js';
import { mockScreepsApiResponse, mockConfig, clearAllMocks } from '../helpers/mocks.js';

describe('Misc Tools', () => {
  let miscHandlers: MiscToolHandlers;
  let apiClient: ApiClient;
  let configManager: ConfigManager;

  beforeEach(() => {
    clearAllMocks();
    configManager = new ConfigManager(mockConfig);
    apiClient = new ApiClient(configManager);
    miscHandlers = new MiscToolHandlers(apiClient);
    global.fetch = jest.fn<typeof fetch>();
  });

  describe('handleGetPvpInfo', () => {
    it('should fetch PvP info successfully', async () => {
      const mockData = {
        ok: 1,
        pvp: {
          total: 100,
          kills: 50,
          deaths: 30,
        },
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await miscHandlers.handleGetPvpInfo({});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('pvp');
    });

    it('should handle interval parameter', async () => {
      const mockData = {
        ok: 1,
        pvp: {},
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await miscHandlers.handleGetPvpInfo({ interval: 180 });

      expect(result.isError).toBeFalsy();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('interval=180'),
        expect.any(Object)
      );
    });

    it('should handle start parameter', async () => {
      const mockData = {
        ok: 1,
        pvp: {},
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await miscHandlers.handleGetPvpInfo({ start: 1000000 });

      expect(result.isError).toBeFalsy();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=1000000'),
        expect.any(Object)
      );
    });

    it('should throw error on network failure', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      await expect(miscHandlers.handleGetPvpInfo({})).rejects.toThrow();
    });
  });

  describe('handleGetNukesInfo', () => {
    it('should fetch nukes info successfully', async () => {
      const mockData = {
        ok: 1,
        nukes: [
          { _id: 'nuke-1', room: 'W7N3', landTime: 5000 },
          { _id: 'nuke-2', room: 'W8N3', landTime: 6000 },
        ],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await miscHandlers.handleGetNukesInfo();

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('nukes');
      expect(result.content[0].text).toContain('W7N3');
    });

    it('should handle empty nukes list', async () => {
      const mockData = {
        ok: 1,
        nukes: [],
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      const result = await miscHandlers.handleGetNukesInfo();

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('nukes');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      await expect(miscHandlers.handleGetNukesInfo()).rejects.toThrow();
    });
  });

  describe('getSchemas', () => {
    it('should return validation schemas', () => {
      const schemas = MiscToolHandlers.getSchemas();

      expect(schemas).toHaveProperty('getPvpInfo');
      expect(schemas).toHaveProperty('getNukesInfo');
    });
  });
});
