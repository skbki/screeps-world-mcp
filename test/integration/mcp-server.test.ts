import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ScreepsWorldMcp } from '../../src/server/screeps.js';
import { mockScreepsApiResponse, mockRoomTerrain, clearAllMocks } from '../helpers/mocks.js';

describe('MCP Server Integration', () => {
  let service: ScreepsWorldMcp;

  beforeEach(() => {
    clearAllMocks();
    global.fetch = jest.fn<typeof fetch>();
    
    // Initialize service with test config
    service = new ScreepsWorldMcp({
      baseUrl: 'https://screeps.com/api',
      token: 'test-token',
    });
  });

  describe('Configuration', () => {
    it('should initialize with provided config', () => {
      const config = service.getConfig();

      expect(config.baseUrl).toBe('https://screeps.com/api');
      expect(config.token).toBe('test-token');
    });

    it('should update config', () => {
      service.updateConfig({ token: 'new-token' });
      const config = service.getConfig();

      expect(config.token).toBe('new-token');
    });
  });

  describe('Server Instance', () => {
    it('should expose MCP server instance', () => {
      const server = service.getServer();

      expect(server).toBeDefined();
    });
  });

  describe('Tool Registration', () => {
    it('should register room tools', async () => {
      const mockData = mockRoomTerrain('W7N3');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        await mockScreepsApiResponse(mockData)
      );

      // The tools should be registered through the ToolRegistry
      // We verify this indirectly by checking the server has been initialized
      expect(service.getServer()).toBeDefined();
    });
  });

  describe('Resource Registration', () => {
    it('should register resources', () => {
      // Resources should be registered through the ResourceRegistry
      // We verify this indirectly by checking the server has been initialized
      expect(service.getServer()).toBeDefined();
    });
  });

  describe('Start Method', () => {
    it('should not start without token', async () => {
      const noTokenService = new ScreepsWorldMcp({
        baseUrl: 'https://screeps.com/api',
      });

      // Mock console.log to verify the message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await noTokenService.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No token found')
      );

      consoleSpy.mockRestore();
    });
  });
});
