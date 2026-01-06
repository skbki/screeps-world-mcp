import { jest } from '@jest/globals';

/**
 * Mock fetch response helper
 */
export function mockFetchResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: {
      get: (key: string) => headers[key] || null,
    },
  } as any);
}

/**
 * Mock Screeps API response with rate limit headers
 */
export function mockScreepsApiResponse(
  data: any, 
  status = 200,
  rateLimitInfo?: { remaining: number; limit: number; reset: number }
) {
  const headers: Record<string, string> = {};
  
  if (rateLimitInfo) {
    headers['X-RateLimit-Limit'] = String(rateLimitInfo.limit);
    headers['X-RateLimit-Remaining'] = String(rateLimitInfo.remaining);
    headers['X-RateLimit-Reset'] = String(rateLimitInfo.reset);
  }
  
  return mockFetchResponse(data, status, headers);
}

/**
 * Mock room terrain data with deterministic pattern
 */
export function mockRoomTerrain(roomName: string) {
  // Create deterministic terrain pattern based on room name hash
  const hash = roomName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return {
    ok: 1,
    terrain: Array(50).fill(null).map((_, y) => 
      Array(50).fill(null).map((_, x) => {
        // Generate deterministic terrain based on position and room hash
        return ((x + y + hash) % 3);
      })
    ),
  };
}

/**
 * Mock room objects data
 */
export function mockRoomObjects(roomName: string) {
  return {
    ok: 1,
    objects: [
      {
        _id: 'test-spawn-1',
        type: 'spawn',
        room: roomName,
        x: 25,
        y: 25,
        user: 'test-user',
      },
      {
        _id: 'test-controller-1',
        type: 'controller',
        room: roomName,
        x: 10,
        y: 10,
        level: 5,
      },
    ],
    users: {
      'test-user': {
        _id: 'user-123',
        username: 'test-user',
      },
    },
  };
}

/**
 * Mock room objects data with many objects for testing pagination
 */
export function mockRoomObjectsLarge(roomName: string) {
  const objects: any[] = [];
  
  // Add 25 spawns
  for (let i = 0; i < 25; i++) {
    objects.push({
      _id: `spawn-${i}`,
      type: 'spawn',
      room: roomName,
      x: i % 10,
      y: Math.floor(i / 10),
    });
  }
  
  // Add 30 extensions
  for (let i = 0; i < 30; i++) {
    objects.push({
      _id: `extension-${i}`,
      type: 'extension',
      room: roomName,
      x: i % 10,
      y: Math.floor(i / 10) + 3,
    });
  }
  
  // Add 15 towers
  for (let i = 0; i < 15; i++) {
    objects.push({
      _id: `tower-${i}`,
      type: 'tower',
      room: roomName,
      x: i % 10,
      y: Math.floor(i / 10) + 6,
    });
  }
  
  // Add 10 creeps
  for (let i = 0; i < 10; i++) {
    objects.push({
      _id: `creep-${i}`,
      type: 'creep',
      room: roomName,
      x: i,
      y: 9,
    });
  }
  
  return {
    ok: 1,
    objects,
    users: {
      'test-user': {
        _id: 'user-123',
        username: 'test-user',
      },
    },
  };
}

/**
 * Mock user authentication data
 */
export function mockAuthMe() {
  return {
    ok: 1,
    _id: 'user-123',
    username: 'test-user',
    email: 'test@example.com',
  };
}

/**
 * Mock game time data
 */
export function mockGameTime() {
  return {
    ok: 1,
    time: 12345678,
  };
}

/**
 * Mock world size data
 */
export function mockWorldSize() {
  return {
    ok: 1,
    width: 202,
    height: 202,
  };
}

/**
 * Mock shards info data
 */
export function mockShardsInfo() {
  return {
    ok: 1,
    shards: [
      { name: 'shard0', rooms: 15000 },
      { name: 'shard1', rooms: 15000 },
      { name: 'shard2', rooms: 15000 },
    ],
  };
}

/**
 * Create a mock fetch function
 */
export function createMockFetch() {
  return jest.fn<typeof fetch>();
}

/**
 * Setup global mocks
 */
export function setupGlobalMocks() {
  global.fetch = createMockFetch();
}

/**
 * Clear all mocks
 */
export function clearAllMocks() {
  jest.clearAllMocks();
}

/**
 * Mock config for testing
 */
export const mockConfig = {
  baseUrl: 'https://screeps.com/api',
  token: 'test-token-123',
  username: 'test-user',
  retryConfig: {
    maxRetries: 3,
    initialDelayMs: 10,  // Short delay for fast tests
    maxDelayMs: 100,     // Cap at 100ms for tests
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
};
