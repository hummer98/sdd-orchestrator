/**
 * MCP Status Broadcast
 * Broadcasts MCP server status changes to all Renderer windows
 *
 * Requirements: 6.9 (status indicator)
 * Design.md: "Remote UI Synchronization Flow"
 *
 * @file mcpStatusBroadcast.ts
 */

// agent-error-notification: logger.ts -> projectLogger migration (Requirements 1.2, 1.3, 1.5)
import { projectLogger as logger } from '../projectLogger';
// trpc-full-migration Task 9.2: EventBus for tRPC Subscription event distribution
import { getGlobalEventBus } from '../../trpc/services/globalEventBus';
import { EVENT_NAMES } from '../../trpc/services/eventBus';
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
 * Broadcast MCP status via EventBus for tRPC Subscription
 *
 * @param status - Current MCP server status
 */
function broadcastMcpStatus(status: McpServerStatus): void {
  // Emit to EventBus for tRPC Subscription (primary path after IPC removal)
  getGlobalEventBus().emit(EVENT_NAMES.MCP_STATUS_CHANGED, status);

  logger.debug('[McpStatusBroadcast] Status broadcast sent', {
    isRunning: status.isRunning,
    port: status.port,
  });
}
