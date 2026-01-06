import { ScreepsConfig, RetryConfig } from '../types/index.js';

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export const DEFAULT_CONFIG: ScreepsConfig = {
  baseUrl: process.env.SCREEPS_BASE_URL || 'https://screeps.com/api',
  token: process.env.SCREEPS_TOKEN,
  username: process.env.SCREEPS_USERNAME,
  retryConfig: DEFAULT_RETRY_CONFIG,
};

export class ConfigManager {
  private config: ScreepsConfig;

  constructor(config: Partial<ScreepsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getConfig(): ScreepsConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ScreepsConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  getToken(): string | undefined {
    return this.config.token;
  }

  getUsername(): string | undefined {
    return this.config.username;
  }

  hasAuthentication(): boolean {
    return !!(this.config.token || this.config.username);
  }

  setToken(token: string): void {
    this.config.token = token;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.token) {
      headers['X-Token'] = this.config.token;
    }
    if (this.config.username) {
      headers['X-Username'] = this.config.username;
    }

    return headers;
  }

  getRetryConfig(): RetryConfig {
    return this.config.retryConfig || DEFAULT_RETRY_CONFIG;
  }
}
