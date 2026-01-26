/**
 * MCP IPC Handlers
 * IPC handlers for MCP server control
 * Requirements: 6.3, 6.4, 6.5 (mcp-server-integration)
 *
 * @file mcpHandlers.ts
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { getMcpServerService } from '../services/mcp/mcpAutoStart';
import { getConfigStore } from '../services/configStore';
import { logger } from '../services/logger';

/**
 * Register MCP IPC handlers
 *
 * Registers handlers for:
 * - MCP_START: Start MCP server
 * - MCP_STOP: Stop MCP server
 * - MCP_GET_STATUS: Get server status
 * - MCP_GET_SETTINGS: Get MCP settings from ConfigStore
 * - MCP_SET_ENABLED: Enable/disable MCP server
 * - MCP_SET_PORT: Set MCP server port
 */
export function registerMcpHandlers(): void {
  const service = getMcpServerService();
  const configStore = getConfigStore();

  // MCP_START handler
  // Requirements: 6.4 - Start MCP server
  ipcMain.handle(
    IPC_CHANNELS.MCP_START,
    async (_event, preferredPort?: number) => {
      logger.info('[McpHandlers] MCP_START called', { preferredPort });

      const result = await service.start(preferredPort);

      if (result.ok) {
        logger.info('[McpHandlers] MCP server started', {
          port: result.value.port,
          url: result.value.url,
        });
      } else {
        logger.error('[McpHandlers] Failed to start MCP server', { error: result.error });
      }

      return result;
    }
  );

  // MCP_STOP handler
  // Requirements: 6.3 - Stop MCP server
  ipcMain.handle(IPC_CHANNELS.MCP_STOP, async () => {
    logger.info('[McpHandlers] MCP_STOP called');

    await service.stop();

    logger.info('[McpHandlers] MCP server stopped');
  });

  // MCP_GET_STATUS handler
  // Get current MCP server status
  ipcMain.handle(IPC_CHANNELS.MCP_GET_STATUS, async () => {
    logger.debug('[McpHandlers] MCP_GET_STATUS called');

    return service.getStatus();
  });

  // MCP_GET_SETTINGS handler
  // Get MCP settings from ConfigStore
  ipcMain.handle(IPC_CHANNELS.MCP_GET_SETTINGS, async () => {
    logger.debug('[McpHandlers] MCP_GET_SETTINGS called');

    return configStore.getMcpSettings();
  });

  // MCP_SET_ENABLED handler
  // Requirements: 6.3, 6.4 - Enable/disable MCP server
  ipcMain.handle(
    IPC_CHANNELS.MCP_SET_ENABLED,
    async (_event, enabled: boolean) => {
      logger.info('[McpHandlers] MCP_SET_ENABLED called', { enabled });

      const currentSettings = configStore.getMcpSettings();
      const newSettings = { ...currentSettings, enabled };

      configStore.setMcpSettings(newSettings);

      if (enabled) {
        // Start server if enabling
        await service.start(currentSettings.port);
      } else {
        // Stop server if disabling
        await service.stop();
      }
    }
  );

  // MCP_SET_PORT handler
  // Requirements: 6.5 - Set MCP server port
  ipcMain.handle(
    IPC_CHANNELS.MCP_SET_PORT,
    async (_event, port: number) => {
      logger.info('[McpHandlers] MCP_SET_PORT called', { port });

      const currentSettings = configStore.getMcpSettings();
      const newSettings = { ...currentSettings, port };

      configStore.setMcpSettings(newSettings);

      // Restart server if running
      const status = service.getStatus();
      if (status.isRunning) {
        await service.stop();
        await service.start(port);
      }
    }
  );

  logger.info('[McpHandlers] MCP IPC handlers registered');
}
