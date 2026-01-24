/**
 * mcpStore Tests
 * mcp-server-integration: Task 7.1
 *
 * Tests for the MCP server state store (Renderer-side cache).
 * Requirements: 6.9
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useMcpStore,
  resetMcpStore,
  getMcpStore,
  type McpStoreState,
  type McpStoreActions,
  type McpServerStatus,
} from './mcpStore';

describe('mcpStore', () => {
  beforeEach(() => {
    resetMcpStore();
  });

  // =============================================================================
  // Initial state
  // Requirements: 6.9
  // =============================================================================
  describe('initial state', () => {
    it('should have isRunning as false by default', () => {
      const state = getMcpStore();
      expect(state.isRunning).toBe(false);
    });

    it('should have port as null by default', () => {
      const state = getMcpStore();
      expect(state.port).toBeNull();
    });

    it('should have url as null by default', () => {
      const state = getMcpStore();
      expect(state.url).toBeNull();
    });
  });

  // =============================================================================
  // setStatus action
  // Requirements: 6.9
  // =============================================================================
  describe('setStatus', () => {
    it('should update state when server is running', () => {
      const store = getMcpStore();
      const status: McpServerStatus = {
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      };

      store.setStatus(status);

      const updatedState = getMcpStore();
      expect(updatedState.isRunning).toBe(true);
      expect(updatedState.port).toBe(3001);
      expect(updatedState.url).toBe('http://localhost:3001');
    });

    it('should update state when server is stopped', () => {
      const store = getMcpStore();
      // First, set running state
      store.setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      // Then, set stopped state
      const stoppedStatus: McpServerStatus = {
        isRunning: false,
        port: null,
        url: null,
      };
      store.setStatus(stoppedStatus);

      const updatedState = getMcpStore();
      expect(updatedState.isRunning).toBe(false);
      expect(updatedState.port).toBeNull();
      expect(updatedState.url).toBeNull();
    });

    it('should handle port change', () => {
      const store = getMcpStore();

      // Start with port 3001
      store.setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      // Change to port 4001
      store.setStatus({
        isRunning: true,
        port: 4001,
        url: 'http://localhost:4001',
      });

      const updatedState = getMcpStore();
      expect(updatedState.port).toBe(4001);
      expect(updatedState.url).toBe('http://localhost:4001');
    });

    it('should handle partial updates (only isRunning changes)', () => {
      const store = getMcpStore();

      // Server running with full status
      store.setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      // setStatus completely replaces state (not partial merge)
      store.setStatus({
        isRunning: false,
        port: null,
        url: null,
      });

      const updatedState = getMcpStore();
      expect(updatedState.isRunning).toBe(false);
      expect(updatedState.port).toBeNull();
      expect(updatedState.url).toBeNull();
    });
  });

  // =============================================================================
  // Reset functionality (for testing)
  // =============================================================================
  describe('resetMcpStore', () => {
    it('should reset to initial state', () => {
      const store = getMcpStore();

      // Set some state
      store.setStatus({
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      });

      // Reset
      resetMcpStore();

      // Verify initial state
      const state = getMcpStore();
      expect(state.isRunning).toBe(false);
      expect(state.port).toBeNull();
      expect(state.url).toBeNull();
    });
  });

  // =============================================================================
  // Type exports
  // =============================================================================
  describe('type exports', () => {
    it('should export McpStoreState type', () => {
      // Type-level test: just verify the type is usable
      const _state: McpStoreState = {
        isRunning: false,
        port: null,
        url: null,
      };
      expect(_state).toBeDefined();
    });

    it('should export McpStoreActions type', () => {
      // Type-level test: verify setStatus is part of actions
      const store = getMcpStore();
      const _actions: McpStoreActions = {
        setStatus: store.setStatus,
      };
      expect(_actions.setStatus).toBeDefined();
    });

    it('should export McpServerStatus type', () => {
      // Type-level test: verify the type is usable
      const _status: McpServerStatus = {
        isRunning: true,
        port: 3001,
        url: 'http://localhost:3001',
      };
      expect(_status).toBeDefined();
    });
  });
});
