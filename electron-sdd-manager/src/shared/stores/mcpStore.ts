/**
 * mcpStore
 * mcp-server-integration: Task 7.1
 *
 * Shared store for MCP server state (Renderer-side cache).
 * Tracks MCP server running status, port, and URL.
 * Requirements: 6.9
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

/**
 * MCP server status (matches McpServerService.getStatus() return type)
 * This is the input to setStatus action
 */
export interface McpServerStatus {
  readonly isRunning: boolean;
  readonly port: number | null;
  readonly url: string | null;
}

/**
 * MCP store state
 * Requirements: 6.9
 */
export interface McpStoreState {
  /** Server running status */
  isRunning: boolean;
  /** Port number (null when not running) */
  port: number | null;
  /** Server URL (null when not running) */
  url: string | null;
}

/**
 * MCP store actions
 * Requirements: 6.9
 */
export interface McpStoreActions {
  /** Update server status */
  setStatus: (status: McpServerStatus) => void;
  /** Initialize store: load initial status and subscribe to changes */
  initialize: () => Promise<void>;
}

export type McpStore = McpStoreState & McpStoreActions;

// =============================================================================
// Module-level state for cleanup
// =============================================================================

let statusUnsubscribe: (() => void) | null = null;

// =============================================================================
// Store
// =============================================================================

export const useMcpStore = create<McpStore>((set) => ({
  // Initial state
  isRunning: false,
  port: null,
  url: null,

  // Actions
  setStatus: (status: McpServerStatus) => {
    set({
      isRunning: status.isRunning,
      port: status.port,
      url: status.url,
    });
  },

  initialize: async () => {
    // Skip if already initialized or if electronAPI is not available (Remote UI)
    if (statusUnsubscribe || typeof window === 'undefined' || !window.electronAPI?.mcpServer) {
      return;
    }

    try {
      // Load initial status
      const status = await window.electronAPI.mcpServer.getStatus();
      set({
        isRunning: status.isRunning,
        port: status.port,
        url: status.url,
      });

      // Subscribe to status changes
      statusUnsubscribe = window.electronAPI.mcpServer.onStatusChanged((newStatus) => {
        set({
          isRunning: newStatus.isRunning,
          port: newStatus.port,
          url: newStatus.url,
        });
      });
    } catch (error) {
      console.error('[mcpStore] Failed to initialize:', error);
    }
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset store to initial state (for testing)
 */
export function resetMcpStore(): void {
  useMcpStore.setState({
    isRunning: false,
    port: null,
    url: null,
  });
}

/**
 * Get current store state (for testing)
 */
export function getMcpStore(): McpStore {
  return useMcpStore.getState();
}
