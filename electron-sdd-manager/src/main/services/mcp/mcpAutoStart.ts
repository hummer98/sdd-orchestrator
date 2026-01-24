/**
 * MCP Auto-Start Module
 * Handles automatic MCP server startup on app launch
 * Task 6.4: アプリ起動時のMCPサーバー自動起動
 * Requirements: 6.1
 *
 * @file mcpAutoStart.ts
 */

import { McpServerService } from './mcpServerService';
import { logger } from '../logger';
import type { McpSettings } from '../configStore';

/**
 * Singleton instance of McpServerService
 */
let mcpServerServiceInstance: McpServerService | null = null;

/**
 * Get the singleton MCP server service instance
 * Creates the instance if it doesn't exist
 *
 * @returns The McpServerService singleton
 */
export function getMcpServerService(): McpServerService {
  if (!mcpServerServiceInstance) {
    mcpServerServiceInstance = new McpServerService();
  }
  return mcpServerServiceInstance;
}

/**
 * Initialize MCP server based on configuration
 * Called during app startup to auto-start MCP server if enabled
 *
 * @param getSettings - Function to retrieve MCP settings (injected for testability)
 * @returns true if server started successfully, false otherwise
 */
export async function initializeMcpServer(
  getSettings: () => McpSettings
): Promise<boolean> {
  const settings = getSettings();

  if (!settings.enabled) {
    logger.info('[MCP] MCP server is disabled in settings', {
      enabled: settings.enabled,
    });
    return false;
  }

  const service = getMcpServerService();

  try {
    const result = await service.start(settings.port);

    if (result.ok) {
      logger.info('[MCP] MCP server auto-started successfully', {
        port: result.value.port,
        url: result.value.url,
      });
      return true;
    } else {
      logger.warn('[MCP] Failed to auto-start MCP server', {
        error: result.error,
      });
      return false;
    }
  } catch (error) {
    logger.error('[MCP] Exception during MCP server auto-start', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
