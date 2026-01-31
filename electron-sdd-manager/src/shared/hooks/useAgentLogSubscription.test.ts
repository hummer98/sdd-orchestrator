/**
 * useAgentLogSubscription Hook Tests
 *
 * agent-log-store-unification Task 2.1, 2.2
 * Requirements: 2.1, 2.2
 *
 * Tests for the shared hook that subscribes to real-time agent log events
 * and updates the SharedAgentStore.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  resetSharedAgentStore,
  getSharedAgentStore,
} from '../stores/agentStore';
import { useAgentLogSubscription } from './useAgentLogSubscription';
import type { ApiClient, ParsedLogEntry } from '../api/types';

// =============================================================================
// Mock ApiClient Factory
// =============================================================================

interface MockApiClientOptions {
  onAgentLogCallback?: (callback: (agentId: string, log: ParsedLogEntry) => void) => () => void;
}

function createMockApiClient(options: MockApiClientOptions = {}): ApiClient {
  const defaultOnAgentLog = (_callback: (agentId: string, log: ParsedLogEntry) => void) => {
    // Return cleanup function
    return () => {};
  };

  return {
    getAgentLogs: async () => ({ ok: true, value: [] }),
    getSpecs: async () => ({ ok: true, value: [] }),
    getSpecDetail: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    executePhase: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    updateApproval: async () => ({ ok: true, value: undefined }),
    getBugs: async () => ({ ok: true, value: [] }),
    getBugDetail: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    executeBugPhase: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    getAgents: async () => ({ ok: true, value: [] }),
    stopAgent: async () => ({ ok: true, value: undefined }),
    resumeAgent: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    sendAgentInput: async () => ({ ok: true, value: undefined }),
    executeProjectCommand: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    executeDocumentReview: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    executeInspection: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    startAutoExecution: async () => ({ ok: false, error: { type: 'NOT_FOUND', message: 'Not found' } }),
    stopAutoExecution: async () => ({ ok: true, value: undefined }),
    getAutoExecutionStatus: async () => ({ ok: true, value: null }),
    saveFile: async () => ({ ok: true, value: undefined }),
    onSpecsUpdated: () => () => {},
    onBugsUpdated: () => () => {},
    onAgentOutput: () => () => {},
    onAgentStatusChange: () => () => {},
    onAgentLog: options.onAgentLogCallback ?? defaultOnAgentLog,
    onAutoExecutionStatusChanged: () => () => {},
    startBugsWatcher: async () => ({ ok: true, value: undefined }),
    stopBugsWatcher: async () => ({ ok: true, value: undefined }),
    onBugsChanged: () => () => {},
    getGitStatus: async () => ({ ok: true, value: { files: [], mode: 'normal' as const } }),
    getGitDiff: async () => ({ ok: true, value: '' }),
    startWatching: async () => ({ ok: true, value: undefined }),
    stopWatching: async () => ({ ok: true, value: undefined }),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function createParsedLogEntry(id: string): ParsedLogEntry {
  return {
    id,
    type: 'text',
    timestamp: Date.now(),
    engineId: 'claude',
    text: {
      content: `Log content ${id}`,
      role: 'assistant',
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('useAgentLogSubscription', () => {
  beforeEach(() => {
    resetSharedAgentStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Task 2.1: onAgentLog購読が設定されること
  // Requirements: 2.1
  // ---------------------------------------------------------------------------
  describe('Task 2.1: onAgentLog subscription setup (Requirement 2.1)', () => {
    it('should call apiClient.onAgentLog when mounted', () => {
      const onAgentLogSpy = vi.fn(() => () => {});
      const apiClient = createMockApiClient({
        onAgentLogCallback: onAgentLogSpy,
      });

      renderHook(() => useAgentLogSubscription(apiClient));

      expect(onAgentLogSpy).toHaveBeenCalledTimes(1);
      expect(onAgentLogSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not call onAgentLog when apiClient is null', () => {
      const onAgentLogSpy = vi.fn(() => () => {});

      // This test verifies hook handles null apiClient gracefully
      const { result } = renderHook(() => useAgentLogSubscription(null));

      // Hook should complete without error
      expect(result.current).toBeUndefined();
      expect(onAgentLogSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Task 2.2: ログ受信時にaddLogが呼び出されること
  // Requirements: 2.2
  // ---------------------------------------------------------------------------
  describe('Task 2.2: addLog call on log receipt (Requirement 2.2)', () => {
    it('should call store.addLog when log event is received', () => {
      let capturedCallback: ((agentId: string, log: ParsedLogEntry) => void) | null = null;

      const apiClient = createMockApiClient({
        onAgentLogCallback: (callback) => {
          capturedCallback = callback;
          return () => {};
        },
      });

      renderHook(() => useAgentLogSubscription(apiClient));

      // Verify callback was captured
      expect(capturedCallback).not.toBeNull();

      // Simulate receiving a log event
      const logEntry = createParsedLogEntry('log-1');
      act(() => {
        capturedCallback!('agent-1', logEntry);
      });

      // Verify log was added to store
      const store = getSharedAgentStore();
      const logs = store.logs.get('agent-1');
      expect(logs).toBeDefined();
      expect(logs).toHaveLength(1);
      expect(logs![0].id).toBe('log-1');
    });

    it('should handle multiple log events for same agent', () => {
      let capturedCallback: ((agentId: string, log: ParsedLogEntry) => void) | null = null;

      const apiClient = createMockApiClient({
        onAgentLogCallback: (callback) => {
          capturedCallback = callback;
          return () => {};
        },
      });

      renderHook(() => useAgentLogSubscription(apiClient));

      // Simulate multiple log events
      const log1 = createParsedLogEntry('log-1');
      const log2 = createParsedLogEntry('log-2');
      const log3 = createParsedLogEntry('log-3');

      act(() => {
        capturedCallback!('agent-1', log1);
        capturedCallback!('agent-1', log2);
        capturedCallback!('agent-1', log3);
      });

      // Verify all logs were added
      const store = getSharedAgentStore();
      const logs = store.logs.get('agent-1');
      expect(logs).toHaveLength(3);
    });

    it('should handle log events for different agents', () => {
      let capturedCallback: ((agentId: string, log: ParsedLogEntry) => void) | null = null;

      const apiClient = createMockApiClient({
        onAgentLogCallback: (callback) => {
          capturedCallback = callback;
          return () => {};
        },
      });

      renderHook(() => useAgentLogSubscription(apiClient));

      // Simulate log events for different agents
      act(() => {
        capturedCallback!('agent-1', createParsedLogEntry('log-a1'));
        capturedCallback!('agent-2', createParsedLogEntry('log-a2'));
      });

      // Verify logs were added to correct agents
      const store = getSharedAgentStore();
      expect(store.logs.get('agent-1')).toHaveLength(1);
      expect(store.logs.get('agent-2')).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // Requirements: 2.1
  // ---------------------------------------------------------------------------
  describe('Cleanup on unmount', () => {
    it('should call cleanup function on unmount', () => {
      const cleanupSpy = vi.fn();

      const apiClient = createMockApiClient({
        onAgentLogCallback: () => cleanupSpy,
      });

      const { unmount } = renderHook(() => useAgentLogSubscription(apiClient));

      // Verify cleanup not called yet
      expect(cleanupSpy).not.toHaveBeenCalled();

      // Unmount
      unmount();

      // Verify cleanup was called
      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });

    it('should re-subscribe when apiClient changes', () => {
      const cleanup1 = vi.fn();
      const onAgentLog1 = vi.fn(() => cleanup1);
      const apiClient1 = createMockApiClient({ onAgentLogCallback: onAgentLog1 });

      const cleanup2 = vi.fn();
      const onAgentLog2 = vi.fn(() => cleanup2);
      const apiClient2 = createMockApiClient({ onAgentLogCallback: onAgentLog2 });

      // Initial render with apiClient1
      const { rerender } = renderHook(
        ({ client }) => useAgentLogSubscription(client),
        { initialProps: { client: apiClient1 } }
      );

      expect(onAgentLog1).toHaveBeenCalledTimes(1);

      // Re-render with apiClient2
      rerender({ client: apiClient2 });

      // Cleanup should have been called for apiClient1
      expect(cleanup1).toHaveBeenCalledTimes(1);
      // onAgentLog should have been called for apiClient2
      expect(onAgentLog2).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('Edge cases', () => {
    it('should handle tool_use log entries', () => {
      let capturedCallback: ((agentId: string, log: ParsedLogEntry) => void) | null = null;

      const apiClient = createMockApiClient({
        onAgentLogCallback: (callback) => {
          capturedCallback = callback;
          return () => {};
        },
      });

      renderHook(() => useAgentLogSubscription(apiClient));

      // Create tool_use log entry
      const toolUseLog: ParsedLogEntry = {
        id: 'tool-use-1',
        type: 'tool_use',
        timestamp: Date.now(),
        engineId: 'claude',
        tool_use: {
          id: 'tu-1',
          name: 'Read',
          input: { file_path: '/test.ts' },
        },
      };

      act(() => {
        capturedCallback!('agent-1', toolUseLog);
      });

      const store = getSharedAgentStore();
      const logs = store.logs.get('agent-1');
      expect(logs).toHaveLength(1);
      expect(logs![0].type).toBe('tool_use');
    });
  });
});
