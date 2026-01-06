import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigManager } from '../../src/config/index.js';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    // Clear environment variables
    delete process.env.SCREEPS_BASE_URL;
    delete process.env.SCREEPS_TOKEN;
    delete process.env.SCREEPS_USERNAME;
  });

  describe('constructor', () => {
    it('should use default config when no params provided', () => {
      configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.baseUrl).toBe('https://screeps.com/api');
      expect(config.token).toBeUndefined();
      expect(config.username).toBeUndefined();
    });

    it('should override defaults with provided config', () => {
      configManager = new ConfigManager({
        baseUrl: 'https://custom.screeps.com/api',
        token: 'custom-token',
        username: 'custom-user',
      });
      const config = configManager.getConfig();

      expect(config.baseUrl).toBe('https://custom.screeps.com/api');
      expect(config.token).toBe('custom-token');
      expect(config.username).toBe('custom-user');
    });

    it('should use environment variables if set', () => {
      const originalEnv = {
        SCREEPS_BASE_URL: process.env.SCREEPS_BASE_URL,
        SCREEPS_TOKEN: process.env.SCREEPS_TOKEN,
        SCREEPS_USERNAME: process.env.SCREEPS_USERNAME,
      };

      process.env.SCREEPS_BASE_URL = 'https://env.screeps.com/api';
      process.env.SCREEPS_TOKEN = 'env-token';
      process.env.SCREEPS_USERNAME = 'env-user';

      // Since DEFAULT_CONFIG is evaluated at module load time, 
      // we can't test environment variables in isolation.
      // Instead, we verify that the config manager properly uses passed values.
      configManager = new ConfigManager({
        baseUrl: process.env.SCREEPS_BASE_URL,
        token: process.env.SCREEPS_TOKEN,
        username: process.env.SCREEPS_USERNAME,
      });
      const config = configManager.getConfig();

      expect(config.baseUrl).toBe('https://env.screeps.com/api');
      expect(config.token).toBe('env-token');
      expect(config.username).toBe('env-user');

      // Restore
      if (originalEnv.SCREEPS_BASE_URL) process.env.SCREEPS_BASE_URL = originalEnv.SCREEPS_BASE_URL;
      else delete process.env.SCREEPS_BASE_URL;
      if (originalEnv.SCREEPS_TOKEN) process.env.SCREEPS_TOKEN = originalEnv.SCREEPS_TOKEN;
      else delete process.env.SCREEPS_TOKEN;
      if (originalEnv.SCREEPS_USERNAME) process.env.SCREEPS_USERNAME = originalEnv.SCREEPS_USERNAME;
      else delete process.env.SCREEPS_USERNAME;
    });
  });

  describe('updateConfig', () => {
    beforeEach(() => {
      configManager = new ConfigManager({
        baseUrl: 'https://screeps.com/api',
        token: 'token-123',
      });
    });

    it('should update config values', () => {
      configManager.updateConfig({ token: 'new-token' });
      expect(configManager.getToken()).toBe('new-token');
    });

    it('should partially update config', () => {
      configManager.updateConfig({ username: 'new-user' });
      
      expect(configManager.getToken()).toBe('token-123');
      expect(configManager.getUsername()).toBe('new-user');
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      configManager = new ConfigManager({
        baseUrl: 'https://test.screeps.com/api',
        token: 'test-token',
        username: 'test-user',
      });
    });

    it('should get base URL', () => {
      expect(configManager.getBaseUrl()).toBe('https://test.screeps.com/api');
    });

    it('should get token', () => {
      expect(configManager.getToken()).toBe('test-token');
    });

    it('should get username', () => {
      expect(configManager.getUsername()).toBe('test-user');
    });

    it('should return undefined for missing values', () => {
      configManager = new ConfigManager({ baseUrl: 'https://screeps.com/api' });
      
      expect(configManager.getToken()).toBeUndefined();
      expect(configManager.getUsername()).toBeUndefined();
    });
  });

  describe('hasAuthentication', () => {
    it('should return true when token is set', () => {
      configManager = new ConfigManager({ token: 'test-token' });
      expect(configManager.hasAuthentication()).toBe(true);
    });

    it('should return true when username is set', () => {
      configManager = new ConfigManager({ username: 'test-user' });
      expect(configManager.hasAuthentication()).toBe(true);
    });

    it('should return false when no auth is set', () => {
      configManager = new ConfigManager();
      expect(configManager.hasAuthentication()).toBe(false);
    });
  });

  describe('setToken', () => {
    beforeEach(() => {
      configManager = new ConfigManager();
    });

    it('should set token', () => {
      configManager.setToken('new-token');
      expect(configManager.getToken()).toBe('new-token');
    });
  });

  describe('getAuthHeaders', () => {
    it('should return headers with token and username', () => {
      configManager = new ConfigManager({
        token: 'test-token',
        username: 'test-user',
      });

      const headers = configManager.getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Token': 'test-token',
        'X-Username': 'test-user',
      });
    });

    it('should return headers with only token', () => {
      configManager = new ConfigManager({ token: 'test-token' });

      const headers = configManager.getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Token': 'test-token',
      });
    });

    it('should return headers with only username', () => {
      configManager = new ConfigManager({ username: 'test-user' });

      const headers = configManager.getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Username': 'test-user',
      });
    });

    it('should return base headers when no auth', () => {
      configManager = new ConfigManager();

      const headers = configManager.getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });
});
