import { z } from 'zod';
import { ApiClient } from '../utils/api.js';
import {
  ToolResult,
  RoomTerrainOptions,
  RoomOptions,
  RoomObjectsOptions,
  RoomOverviewOptions,
  DistanceCalculationOptions,
  RoomCoordinates,
} from '../types/index.js';

export class RoomToolHandlers {
  constructor(private apiClient: ApiClient) {}

  async handleGetRoomTerrain(params: RoomTerrainOptions): Promise<ToolResult> {
    try {
      const endpoint = this.apiClient.buildEndpointWithQuery('/game/room-terrain', params);
      const data = await this.apiClient.makeApiCall(endpoint);

      const additionalGuidance = [
        'Use terrain data to plan creep paths and identify chokepoints',
        'Check for natural barriers that might affect room layout',
        'Consider terrain when planning structure placement',
      ];

      return this.apiClient.createEnhancedToolResult(
        data,
        endpoint,
        `Room Terrain Analysis for ${params.room}`,
        false,
        additionalGuidance,
      );
    } catch (error) {
      return this.apiClient.createToolResult(
        `Error getting room terrain: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  }

  async handleGetRoomObjects(params: RoomObjectsOptions): Promise<ToolResult> {
    try {
      // Build endpoint with only the room and shard parameters
      const apiParams: { room: string; shard?: string } = { room: params.room };
      if (params.shard) {
        apiParams.shard = params.shard;
      }
      
      const endpoint = this.apiClient.buildEndpointWithQuery('/game/room-objects', apiParams);
      const data = await this.apiClient.makeApiCall(endpoint);

      // Process the data for pagination and grouping
      const processedData = this.processRoomObjectsData(data, params);

      const additionalGuidance = this.buildRoomObjectsGuidance(processedData, params);

      return this.apiClient.createEnhancedToolResult(
        processedData,
        endpoint,
        `Room Objects Analysis for ${params.room}`,
        false,
        additionalGuidance,
      );
    } catch (error) {
      return this.apiClient.createToolResult(
        `Error getting room objects: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  }

  private processRoomObjectsData(data: any, params: RoomObjectsOptions): any {
    // If no objects in response, return as-is
    if (!data?.objects || !Array.isArray(data.objects)) {
      return data;
    }

    let objects = data.objects;
    const totalObjects = objects.length;

    // Filter by object type if specified
    // Note: Object types are validated by the Screeps API, not client-side
    // Common types include: spawn, extension, tower, creep, controller, road, etc.
    if (params.objectType) {
      const types = params.objectType.split(',').map((t) => t.trim().toLowerCase());
      objects = objects.filter((obj: any) => 
        obj.type && types.includes(obj.type.toLowerCase())
      );
    }

    // Group by type if requested
    if (params.groupByType) {
      const grouped: Record<string, any[]> = {};
      objects.forEach((obj: any) => {
        const type = obj.type || 'unknown';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(obj);
      });

      // Calculate metadata for each group
      const groupSummary = Object.entries(grouped).map(([type, items]) => ({
        type,
        count: items.length,
      }));

      return {
        ...data,
        objects: grouped,
        _metadata: {
          totalObjects,
          filteredObjects: objects.length,
          groupedByType: true,
          groupSummary,
        },
      };
    }

    // Paginate if requested
    // Note: Zod schema validates page >= 1, but Math.max provides defensive programming
    if (params.page !== undefined) {
      const page = Math.max(1, params.page);
      const pageSize = Math.min(200, Math.max(1, params.pageSize || 50));
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedObjects = objects.slice(startIndex, endIndex);
      // Ensure totalPages is at least 1 when pagination is requested, even for empty results
      const totalPages = Math.max(1, Math.ceil(objects.length / pageSize));

      return {
        ...data,
        objects: paginatedObjects,
        _metadata: {
          totalObjects,
          filteredObjects: objects.length,
          pagination: {
            page,
            pageSize,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            objectsOnPage: paginatedObjects.length,
            startIndex: startIndex + 1,
            endIndex: Math.min(endIndex, objects.length),
          },
        },
      };
    }

    // Return with metadata even if not paginating
    if (params.objectType || objects.length !== totalObjects) {
      return {
        ...data,
        objects,
        _metadata: {
          totalObjects,
          filteredObjects: objects.length,
        },
      };
    }

    return data;
  }

  private buildRoomObjectsGuidance(data: any, params: RoomObjectsOptions): string[] {
    const guidance: string[] = [];

    // Check if data has pagination metadata
    if (data._metadata?.pagination) {
      const { page, totalPages, hasNextPage, hasPreviousPage, objectsOnPage } = data._metadata.pagination;
      
      guidance.push(`📄 PAGE ${page} of ${totalPages}: Showing ${objectsOnPage} objects`);
      
      if (hasNextPage) {
        guidance.push(`➡️ NEXT PAGE: Call with page=${page + 1} to see more objects`);
      }
      
      if (hasPreviousPage) {
        guidance.push(`⬅️ PREVIOUS PAGE: Call with page=${page - 1} to see previous objects`);
      }
      
      if (!hasNextPage) {
        guidance.push('✅ LAST PAGE: All objects have been retrieved');
      }
      
      // Context-aware analysis guidance for paginated results
      if (objectsOnPage === 0) {
        guidance.push('ℹ️ EMPTY PAGE: No objects found on this page');
        guidance.push('🎯 SUGGESTION: Try a different page number or adjust filters');
      } else {
        guidance.push('📊 ANALYZE THIS PAGE: Process the structures, creeps, and resources on this page');
        guidance.push('🎯 NEXT: Use objects from this page; call next page if more data needed');
        guidance.push('Analyze structures on this page to understand room development');
        guidance.push('Check for enemy creeps or defensive structures on this page');
        guidance.push('Look for resource deposits and energy sources on this page');
      }
    } else if (data._metadata?.groupedByType) {
      guidance.push('📊 GROUPED BY TYPE: Objects organized by their type for easier analysis');
      guidance.push('🎯 ANALYZE: Review each group to understand room composition');
      guidance.push('Analyze structure groups to understand room development level');
      guidance.push('Check creep groups for enemy creeps or defensive forces');
      guidance.push('Look for resource groups to identify energy sources and deposits');
    } else if (data._metadata?.filteredObjects !== undefined) {
      const filteredCount = data._metadata.filteredObjects;
      guidance.push(`🔍 FILTERED: Showing ${filteredCount} of ${data._metadata.totalObjects} objects`);
      
      if (filteredCount === 0) {
        guidance.push('ℹ️ NO MATCHES: No objects match the specified filter');
        guidance.push('🎯 SUGGESTION: Try different object types or remove the filter');
      } else {
        guidance.push('📊 ANALYZE FILTERED SET: Focus on objects matching your filter criteria');
        guidance.push('🎯 NEXT: Use filtered data to answer your specific query');
        guidance.push('Analyze filtered structures to understand specific aspects of the room');
      }
    } else {
      guidance.push('✅ COMPLETE: All room objects retrieved successfully - NO MORE CALLS NEEDED');
      guidance.push('🛑 STOP: This data is complete - do NOT call get_room_objects again for this room');
      guidance.push('📊 ANALYZE: Process the structures, creeps, and resources from this response');
      guidance.push('🎯 NEXT: Use this data to understand room composition and development level');
      guidance.push('Analyze structures to understand room development level');
      guidance.push('Check for enemy creeps or defensive structures');
      guidance.push('Look for resource deposits and energy sources');
    }

    return guidance;
  }

  async handleGetRoomOverview(params: RoomOverviewOptions): Promise<ToolResult> {
    try {
      const endpoint = this.apiClient.buildEndpointWithQuery('/game/room-overview', params);
      const data = await this.apiClient.makeApiCall(endpoint);

      const additionalGuidance = [
        'Use overview data to track room performance trends',
        'Compare statistics across different time intervals',
        'Identify rooms that need attention or optimization',
      ];

      return this.apiClient.createEnhancedToolResult(
        data,
        endpoint,
        `Room Overview for ${params.room}`,
        false,
        additionalGuidance,
      );
    } catch (error) {
      return this.apiClient.createToolResult(
        `Error getting room overview: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  }

  async handleGetRoomStatus(params: RoomOptions): Promise<ToolResult> {
    try {
      const endpoint = this.apiClient.buildEndpointWithQuery('/game/room-status', params);
      const data = await this.apiClient.makeApiCall(endpoint);

      const additionalGuidance = [
        'Check room status before planning operations',
        'Verify room accessibility and ownership',
        'Use status to understand room type and restrictions',
      ];

      return this.apiClient.createEnhancedToolResult(
        data,
        endpoint,
        `Room Status for ${params.room}`,
        false,
        additionalGuidance,
      );
    } catch (error) {
      return this.apiClient.createToolResult(
        `Error getting room status: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  }

  async handleCalculateDistance(params: DistanceCalculationOptions): Promise<ToolResult> {
    try {
      const parseRoom = (roomName: string): RoomCoordinates => {
        const match = roomName.match(/^([EW])(\d+)([NS])(\d+)$/);
        if (!match) throw new Error(`Invalid room name: ${roomName}`);

        const [, ew, x, ns, y] = match;

        const xNum = parseInt(x);
        const xCoord = ew === 'E' ? xNum : -(xNum + 1);

        const yNum = parseInt(y);
        const yCoord = ns === 'N' ? yNum : -(yNum + 1);

        return { x: xCoord, y: yCoord };
      };

      const fromCoords = parseRoom(params.from);
      const toCoords = parseRoom(params.to);

      // Calculate grid-based distances for Screeps world
      const deltaX = Math.abs(toCoords.x - fromCoords.x);
      const deltaY = Math.abs(toCoords.y - fromCoords.y);

      // Chebyshev distance (max of horizontal/vertical moves - allows diagonal movement)
      const chebyshevDistance = Math.max(deltaX, deltaY);

      const distanceData = {
        from: params.from,
        to: params.to,
        fromCoords,
        toCoords,
        deltaX,
        deltaY,
        chebyshevDistance,
        manhattanDistance: deltaX + deltaY,
        euclideanDistance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
      };

      const additionalGuidance = [
        '✅ Distance calculation complete - no additional API calls needed',
        'Use Chebyshev distance for room-to-room movement planning',
        'Consider Manhattan distance for creep pathfinding estimates',
        'Factor in terrain and obstacles for actual travel time',
      ];

      return this.apiClient.createEnhancedToolResult(
        distanceData,
        `calculate_distance(${params.from}, ${params.to})`,
        `Distance Calculation: ${params.from} to ${params.to}`,
        false,
        additionalGuidance,
      );
    } catch (error) {
      return this.apiClient.createToolResult(
        `Error calculating distance: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  }

  // Zod schemas for validation
  static getSchemas() {
    return {
      roomTerrain: {
        room: z.string().describe('Room name (e.g., E1N8)'),
        shard: z.string().optional().describe('Shard name (default: shard0)'),
        encoded: z.boolean().optional().describe('Return encoded terrain data'),
      },
      roomObjects: {
        room: z.string().describe('Room name (e.g., E1N8)'),
        shard: z.string().optional().describe('Shard name (default: shard0)'),
        objectType: z.string().optional().describe('Filter by object type(s), e.g., "spawn" or "spawn,tower,extension"'),
        groupByType: z.boolean().optional().describe('Group objects by their type for easier analysis'),
        page: z.number().int().min(1).optional().describe('Page number for pagination (1-based)'),
        pageSize: z.number().int().min(1).max(200).optional().describe('Number of objects per page (default: 50, max: 200)'),
      },
      roomOverview: {
        room: z.string().describe('Room name (e.g., E1N8)'),
        shard: z.string().optional().describe('Shard name (default: shard0)'),
        interval: z.enum(['8', '180', '1440']).optional().describe('Interval: 8=1hr, 180=24hr, 1440=7days'),
      },
      roomStatus: {
        room: z.string().describe('Room name (e.g., E1N8)'),
        shard: z.string().optional().describe('Shard name (default: shard0)'),
      },
      calculateDistance: {
        from: z.string().describe('Source room name (e.g., E1N8)'),
        to: z.string().describe('Destination room name (e.g., E2N8)'),
      },
    };
  }
}
