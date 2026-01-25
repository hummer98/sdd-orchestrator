/**
 * MCP Status Broadcast
 * Broadcasts MCP server status changes to all Renderer windows
 *
 * Requirements: 6.9 (status indicator)
 * Design.md: "Remote UI Synchronization Flow"
 *
 * @file mcpStatusBroadcast.ts
 */

import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../ipc/channels';
import { logger } from '../logger';
import type { McpServerService, McpServerStatus } from './mcpServerService';

/**
 * Setup MCP status broadcast to Renderer windows
 *
 * Subscribes to McpServerService status changes and broadcasts
 * to all active BrowserWindows via IPC.
 *
 * @param service - McpServerService instance to monitor
 * @returns Unsubscribe function
 */
export function setupMcpStatusBroadcast(service: McpServerService): () => void {
  const unsubscribe = service.onStatusChange((status: McpServerStatus) => {
    broadcastMcpStatus(status);
  });

  logger.info('[McpStatusBroadcast] Status broadcast setup complete');

  return unsubscribe;
}

/**
 * Broadcast MCP status to all Renderer windows
 *
 * @param status - Current MCP server status
 */
function broadcastMcpStatus(status: McpServerStatus): void {
  const windows = BrowserWindow.getAllWindows();

  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.MCP_STATUS_CHANGED, status);
    }
  }

  logger.debug('[McpStatusBroadcast] Status broadcast sent', {
    isRunning: status.isRunning,
    port: status.port,
    windowCount: windows.length,
  });
}
