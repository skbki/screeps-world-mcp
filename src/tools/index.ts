import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../utils/api.js';
import { ConfigManager } from '../config/index.js';
import { RoomToolHandlers } from './room.js';
import { UserToolHandlers } from './user.js';
import { MarketToolHandlers } from './market.js';
import { MiscToolHandlers } from './misc.js';
import { AuthSigninOptions, ToolResult } from '../types/index.js';
import { isScreepsApiError, isValidationError, isRateLimitError, isAuthenticationError } from '../utils/errors.js';

export class ToolRegistry {
  private roomHandlers: RoomToolHandlers;
  private userHandlers: UserToolHandlers;
  private marketHandlers: MarketToolHandlers;
  private miscHandlers: MiscToolHandlers;

  constructor(
    private apiClient: ApiClient,
    private configManager: ConfigManager,
  ) {
    this.roomHandlers = new RoomToolHandlers(apiClient);
    this.userHandlers = new UserToolHandlers(apiClient);
    this.marketHandlers = new MarketToolHandlers(apiClient);
    this.miscHandlers = new MiscToolHandlers(apiClient);
  }

  /**
   * Error boundary wrapper for tool handlers.
   * Catches errors thrown by handlers and converts them to ToolResult with isError=true.
   * This provides a consistent error handling pattern across all tools.
   */
  private async handleToolError<T>(
    handler: () => Promise<ToolResult>,
  ): Promise<ToolResult> {
    try {
      return await handler();
    } catch (error) {
      // Create detailed error message based on error type
      let errorMessage: string;
      let errorDetails: string[] = [];

      if (isRateLimitError(error)) {
        errorMessage = `Rate Limit Error: ${error.message}`;
        if (error.retryAfter) {
          errorDetails.push(`Retry after: ${error.retryAfter} seconds`);
        }
        errorDetails.push(`Status code: ${error.statusCode}`);
      } else if (isAuthenticationError(error)) {
        errorMessage = `Authentication Error: ${error.message}`;
        errorDetails.push(`Status code: ${error.statusCode}`);
        errorDetails.push('Check your SCREEPS_TOKEN environment variable');
      } else if (isValidationError(error)) {
        errorMessage = `Validation Error: ${error.message}`;
        errorDetails.push(`Field: ${error.field}`);
        errorDetails.push(`Value: ${JSON.stringify(error.value)}`);
      } else if (isScreepsApiError(error)) {
        errorMessage = `API Error: ${error.message}`;
        errorDetails.push(`Error code: ${error.code}`);
        if (error.statusCode) {
          errorDetails.push(`Status code: ${error.statusCode}`);
        }
        if (error.context) {
          errorDetails.push(`Context: ${JSON.stringify(error.context)}`);
        }
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
        errorDetails.push(`Type: ${error.name}`);
      } else {
        errorMessage = `Unknown error: ${String(error)}`;
      }

      const fullMessage = errorDetails.length > 0
        ? `${errorMessage}\n\nDetails:\n${errorDetails.map(d => `- ${d}`).join('\n')}`
        : errorMessage;

      return this.apiClient.createToolResult(fullMessage, true);
    }
  }

  private async convertResult(resultPromise: Promise<any>): Promise<any> {
    const result = await resultPromise;
    return result as any;
  }

  registerAll(server: McpServer): void {
    const roomSchemas = RoomToolHandlers.getSchemas();
    const userSchemas = UserToolHandlers.getSchemas();
    const marketSchemas = MarketToolHandlers.getSchemas();
    const miscSchemas = MiscToolHandlers.getSchemas();

    // Room Tools
    server.registerTool(
      'get_room_terrain',
      {
        title: 'Get Room Terrain',
        description:
          'Get terrain information for a specific room. Call this tool ONCE per room - terrain data is static and complete in a single response.',
        inputSchema: roomSchemas.roomTerrain,
      },
      (params) => this.handleToolError(() => this.roomHandlers.handleGetRoomTerrain(params)),
    );

    server.registerTool(
      'get_room_objects',
      {
        title: 'Get Room Objects',
        description:
          'Get objects and users in a specific room. Supports pagination (page/pageSize), filtering by object type, and grouping by type to manage large result sets. For large rooms, use pagination or filtering to reduce output size. Note: groupByType and pagination are mutually exclusive; if both are specified, grouping takes precedence.',
        inputSchema: roomSchemas.roomObjects,
      },
      (params) => this.handleToolError(() => this.roomHandlers.handleGetRoomObjects(params)),
    );

    server.registerTool(
      'get_room_overview',
      {
        title: 'Get Room Overview',
        description:
          'Get room overview and statistics. Call this tool ONCE per room/interval combination - provides complete statistical data in a single response.',
        inputSchema: roomSchemas.roomOverview,
      },
      (params) => this.handleToolError(() => this.roomHandlers.handleGetRoomOverview(params)),
    );

    server.registerTool(
      'get_room_status',
      {
        title: 'Get Room Status',
        description:
          'Get room status information. Call this tool ONCE per room - status data is complete and rarely changes.',
        inputSchema: roomSchemas.roomStatus,
      },
      (params) => this.handleToolError(() => this.roomHandlers.handleGetRoomStatus(params)),
    );

    server.registerTool(
      'calculate_distance',
      {
        title: 'Calculate Distance',
        description: 'Calculate distance between two rooms',
        inputSchema: roomSchemas.calculateDistance,
      },
      (params) => this.handleToolError(() => this.roomHandlers.handleCalculateDistance(params)),
    );

    // User Tools
    server.registerTool(
      'get_user_name',
      {
        title: 'Get User Name',
        description: 'Get user name',
        inputSchema: userSchemas.getUserName,
      },
      () => this.handleToolError(() => this.userHandlers.handleGetUserName()),
    );

    server.registerTool(
      'get_user_stats',
      {
        title: 'Get User Statistics',
        description: 'Get user statistics',
        inputSchema: userSchemas.getUserStats,
      },
      (params) => this.handleToolError(() => this.userHandlers.handleGetUserStats(params)),
    );

    server.registerTool(
      'get_user_rooms',
      {
        title: 'Get User Rooms',
        description: 'Get user rooms by user ID. Use find_user tool first to get the user ID from username.',
        inputSchema: userSchemas.getUserRooms,
      },
      (params) => this.handleToolError(() => this.userHandlers.handleGetUserRooms(params)),
    );

    server.registerTool(
      'find_user',
      {
        title: 'Find User',
        description: 'Find user by ID or username',
        inputSchema: userSchemas.findUser,
      },
      (params) => this.handleToolError(() => this.userHandlers.handleFindUser(params)),
    );

    server.registerTool(
      'get_user_overview',
      {
        title: 'Get User Overview',
        description: 'Get user overview statistics',
        inputSchema: userSchemas.getUserOverview,
      },
      (params) => this.handleToolError(() => this.userHandlers.handleGetUserOverview(params)),
    );

    server.registerTool(
      'execute_console_command',
      {
        title: 'Execute Console Command',
        description: 'Execute console command in Screeps',
        inputSchema: userSchemas.executeConsoleCommand,
      },
      (params) => this.handleToolError(() => this.userHandlers.handleExecuteConsoleCommand(params)),
    );

    server.registerTool(
      'get_user_memory',
      {
        title: 'Get User Memory',
        description: 'Get user memory data',
        inputSchema: userSchemas.getUserMemory,
      },
      (params) => this.handleToolError(() => this.userHandlers.handleGetUserMemory(params)),
    );

    server.registerTool(
      'auth_signin',
      {
        title: 'Sign In',
        description: 'Sign in to get authentication token on private servers',
        inputSchema: userSchemas.authSignin,
      },
      async (params: AuthSigninOptions) => {
        return this.handleToolError(async () => {
          const { result, token } = await this.userHandlers.handleAuthSignin(params);

          // Update token if signin was successful
          if (token) {
            this.configManager.setToken(token);
          }

          return result;
        });
      },
    );

    // Market Tools
    server.registerTool(
      'get_market_orders_index',
      {
        title: 'Get Market Orders Index',
        description: 'Get market orders index',
        inputSchema: marketSchemas.getMarketOrdersIndex,
      },
      () => this.handleToolError(() => this.marketHandlers.handleGetMarketOrdersIndex()),
    );

    server.registerTool(
      'get_my_market_orders',
      {
        title: 'Get My Market Orders',
        description: "Get user's market orders",
        inputSchema: marketSchemas.getMyMarketOrders,
      },
      () => this.handleToolError(() => this.marketHandlers.handleGetMyMarketOrders()),
    );

    server.registerTool(
      'get_market_orders',
      {
        title: 'Get Market Orders',
        description: 'Get market orders for a specific resource',
        inputSchema: marketSchemas.getMarketOrders,
      },
      (params) => this.handleToolError(() => this.marketHandlers.handleGetMarketOrders(params)),
    );

    server.registerTool(
      'get_money_history',
      {
        title: 'Get Money History',
        description: 'Get user money transaction history',
        inputSchema: marketSchemas.getMoneyHistory,
      },
      (params) => this.handleToolError(() => this.marketHandlers.handleGetMoneyHistory(params)),
    );

    server.registerTool(
      'get_map_stats',
      {
        title: 'Get Map Statistics',
        description: 'Get map statistics for specified rooms',
        inputSchema: marketSchemas.getMapStats,
      },
      (params) => this.handleToolError(() => this.marketHandlers.handleGetMapStats(params)),
    );

    // Miscellaneous Tools
    server.registerTool(
      'get_pvp_info',
      {
        title: 'Get PvP Information',
        description: 'Get PvP information from experimental endpoint',
        inputSchema: miscSchemas.getPvpInfo,
      },
      (params) => this.handleToolError(() => this.miscHandlers.handleGetPvpInfo(params)),
    );

    server.registerTool(
      'get_nukes_info',
      {
        title: 'Get Nukes Information',
        description: 'Get active nukes information by shard',
        inputSchema: miscSchemas.getNukesInfo,
      },
      () => this.handleToolError(() => this.miscHandlers.handleGetNukesInfo()),
    );
  }
}
