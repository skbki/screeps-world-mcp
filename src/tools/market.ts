import { z } from 'zod';
import { ApiClient } from '../utils/api.js';
import { ToolResult, MarketOrderOptions, MoneyHistoryOptions, MapStatsOptions } from '../types/index.js';

export class MarketToolHandlers {
  constructor(private apiClient: ApiClient) {}

  async handleGetMarketOrdersIndex(): Promise<ToolResult> {
    const endpoint = '/game/market/orders-index';
    const data = await this.apiClient.makeApiCall(endpoint);

    const additionalGuidance = [
      'Use this index to understand available market resources',
      'Check resource availability before placing orders',
      'Market index provides overview - use get_market_orders for specific resources',
    ];

    return this.apiClient.createEnhancedToolResult(data, endpoint, 'Market Orders Index', false, additionalGuidance);
  }

  async handleGetMyMarketOrders(): Promise<ToolResult> {
    const endpoint = '/game/market/my-orders';
    const data = await this.apiClient.makeApiCall(endpoint);

    const additionalGuidance = [
      'Review your active orders to understand your market position',
      'Check order status and remaining quantities',
      'Cancel or modify orders based on market conditions',
    ];

    return this.apiClient.createEnhancedToolResult(data, endpoint, 'My Market Orders', false, additionalGuidance);
  }

  async handleGetMarketOrders(params: MarketOrderOptions): Promise<ToolResult> {
    const endpoint = this.apiClient.buildEndpointWithQuery('/game/market/orders', params);
    const data = await this.apiClient.makeApiCall(endpoint);

    const additionalGuidance = [
      `Market data for ${params.resourceType} retrieved successfully`,
      'Analyze price trends and order volumes from this data',
      'Compare buy/sell orders to identify trading opportunities',
      'Use this data for market analysis - no need to fetch again immediately',
    ];

    return this.apiClient.createEnhancedToolResult(
      data,
      endpoint,
      `Market Orders for ${params.resourceType}`,
      false,
      additionalGuidance,
    );
  }

  async handleGetMoneyHistory(params: MoneyHistoryOptions): Promise<ToolResult> {
    const endpoint = this.apiClient.buildEndpointWithQuery('/user/money-history', params);
    const data = await this.apiClient.makeApiCall(endpoint);

    const additionalGuidance = [
      'Review transaction history to understand spending patterns',
      'Track income and expenses over time',
      'Identify major transactions and their impact on your credits',
      'Transaction history is complete - analyze the data provided',
    ];

    return this.apiClient.createEnhancedToolResult(
      data,
      endpoint,
      `Money Transaction History (Page ${params.page || 0})`,
      false,
      additionalGuidance,
    );
  }

  async handleGetMapStats(params: MapStatsOptions): Promise<ToolResult> {
    const endpoint = this.apiClient.buildEndpointWithQuery('/game/map-stats', params);

    const data = await this.apiClient.makeApiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify({ rooms: params.rooms, statName: params.statName }),
    });

    const additionalGuidance = [
      `Map statistics for ${params.statName} retrieved for ${params.rooms.length} rooms`,
      'Compare statistics across different rooms to identify patterns',
      'Use this data for strategic planning and room evaluation',
      'Statistical analysis complete - no additional map stats calls needed',
    ];

    return this.apiClient.createEnhancedToolResult(
      data,
      endpoint,
      `Map Statistics: ${params.statName} for ${params.rooms.join(', ')}`,
      false,
      additionalGuidance,
    );
  }

  // Zod schemas for validation
  static getSchemas() {
    return {
      getMarketOrdersIndex: {},
      getMyMarketOrders: {},
      getMarketOrders: {
        resourceType: z.string().describe('Resource type (e.g., Z, H, O)'),
      },
      getMoneyHistory: {
        page: z.number().optional().describe('Page number (default: 0)'),
      },
      getMapStats: {
        rooms: z.array(z.string()).describe('Array of room names (e.g., ["W50N50", "E1N8"])'),
        statName: z.string().describe('Statistic name (e.g., owner0, creepsLost, energyHarvested)'),
        shard: z.string().optional().describe('Shard name (default: shard0)'),
      },
    };
  }
}
