/**
 * Agent Store Adapter Tests
 * agent-store-unification feature
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * Tests for the Electron IPC adapter that bridges shared/agentStore with electronAPI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  agentOperations,
  setupAgentEventListeners,
  skipPermissionsOperations,
} from './agentStoreAdapter';
import {
  useSharedAgentStore,
  resetSharedAgentStore,
  getSharedAgentStore,
} from '@shared/stores/agentStore';

// Mock window.electronAPI
const mockElectronAPI = {
  startAgent: vi.fn(),
  stopAgent: vi.fn(),
  resumeAgent: vi.fn(),
  deleteAgent: vi.fn(),
  sendAgentInput: vi.fn(),
  getAgentLogs: vi.fn(),
  getAllAgents: vi.fn(),
  getRunningAgentCounts: vi.fn(),
  saveSkipPermissions: vi.fn(),
  loadSkipPermissions: vi.fn(),
  onAgentOutput: vi.fn(),
  onAgentStatusChange: vi.fn(),
  onAgentRecordChanged: vi.fn(),
  // main-process-log-parser integration: parsed log listener
  onAgentLog: vi.fn(),
};

// Set up global mock
beforeEach(() => {
  (window as unknown as { electronAPI: typeof mockElectronAPI }).electronAPI = mockElectronAPI;
  resetSharedAgentStore();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('agentStoreAdapter', () => {
  // =============================================================================
  // Task 2.1: agentStoreAdapter.tsファイル作成
  // Requirements: 2.1
  // =============================================================================
  describe('Task 2.1: agentStoreAdapter file creation', () => {
    it('should export agentOperations object', () => {
      expect(agentOperations).toBeDefined();
      expect(typeof agentOperations).toBe('object');
    });

    it('should export setupAgentEventListeners function', () => {
      expect(setupAgentEventListeners).toBeDefined();
      expect(typeof setupAgentEventListeners).toBe('function');
    });

    it('should export skipPermissionsOperations object', () => {
      expect(skipPermissionsOperations).toBeDefined();
      expect(typeof skipPermissionsOperations).toBe('object');
    });
  });

  // =============================================================================
  // Task 2.2: agentOperationsオブジェクト実装
  // Requirements: 2.2, 2.3
  // =============================================================================
  describe('Task 2.2: agentOperations object', () => {
    describe('startAgent', () => {
      it('should call window.electronAPI.startAgent and add agent to shared store', async () => {
        const mockAgent = {
          agentId: 'agent-1',
          specId: 'spec-a',
          phase: 'requirements',
          pid: 12345,
          sessionId: 'session-1',
          status: 'running' as const,
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          command: 'claude',
        };
        mockElectronAPI.startAgent.mockResolvedValue(mockAgent);

        // unified-engine-command-resolution: command parameter removed, engineId used instead
        const result = await agentOperations.startAgent(
          'spec-a',
          'requirements',
          ['-p'],
          'doc',
          'session-1',
          'claude'
        );

        expect(mockElectronAPI.startAgent).toHaveBeenCalledWith(
          'spec-a',
          'requirements',
          ['-p'],
          'doc',
          'session-1',
          'claude'
        );
        expect(result).toBe('agent-1');

        // zustand-agent-selector-hooks: Verify agent was added to shared store
        // Use agents Map directly since getAgentsForSpec was removed
        const state = getSharedAgentStore();
        const agents = state.getAgentsForSpec('spec-a');
        expect(agents).toHaveLength(1);
        // agentId-unification: Use agentId instead of id
        expect(agents[0].agentId).toBe('agent-1');
      });

      it('should return null on error', async () => {
        mockElectronAPI.startAgent.mockRejectedValue(new Error('Spawn failed'));

        // unified-engine-command-resolution: command parameter removed, engineId used instead
        const result = await agentOperations.startAgent(
          'spec-a',
          'requirements',
          [],
          undefined,
          undefined,
          'claude'
        );

        expect(result).toBeNull();
      });
    });

    describe('stopAgent', () => {
      it('should call window.electronAPI.stopAgent', async () => {
        mockElectronAPI.stopAgent.mockResolvedValue(undefined);

        await agentOperations.stopAgent('agent-1');

        expect(mockElectronAPI.stopAgent).toHaveBeenCalledWith('agent-1');
      });
    });

    describe('resumeAgent', () => {
      it('should call window.electronAPI.resumeAgent', async () => {
        mockElectronAPI.resumeAgent.mockResolvedValue({
          agentId: 'agent-1',
          status: 'running',
        });

        await agentOperations.resumeAgent('agent-1', 'custom prompt');

        expect(mockElectronAPI.resumeAgent).toHaveBeenCalledWith('agent-1', 'custom prompt');
      });

      // Bug fix: agent-log-user-input-duplicate
      // User input log is now added only via Main process (onAgentLog IPC)
      // to avoid duplicate entries. This test verifies no local log is added.
      it('should NOT add stdin log entry locally (handled by Main process)', async () => {
        mockElectronAPI.resumeAgent.mockResolvedValue({
          agentId: 'agent-1',
          status: 'running',
        });

        await agentOperations.resumeAgent('agent-1', 'user input');

        // Verify NO log was added locally (Main process will send it via onAgentLog)
        const state = getSharedAgentStore();
        const logs = state.getLogsForAgent('agent-1');
        expect(logs).toHaveLength(0);
      });
    });

    describe('removeAgent', () => {
      it('should call window.electronAPI.deleteAgent and remove from shared store', async () => {
        // First add the agent
        // agentId-unification: Use agentId instead of id
        const mockAgent = {
          agentId: 'agent-1',
          specId: 'spec-a',
          phase: 'requirements',
          status: 'completed' as const,
          startedAt: new Date().toISOString(),
          command: 'claude',
        };
        useSharedAgentStore.getState().addAgent('spec-a', mockAgent);

        mockElectronAPI.deleteAgent.mockResolvedValue(undefined);

        await agentOperations.removeAgent('agent-1');

        expect(mockElectronAPI.deleteAgent).toHaveBeenCalledWith('spec-a', 'agent-1');

        // zustand-agent-selector-hooks: Verify agent was removed from shared store
        // Use agents Map directly since getAgentsForSpec was removed
        const state = getSharedAgentStore();
        const specAgents = state.agents.get('spec-a') || [];
        expect(specAgents).toHaveLength(0);
      });
    });

    describe('sendInput', () => {
      it('should call window.electronAPI.sendAgentInput', async () => {
        mockElectronAPI.sendAgentInput.mockResolvedValue(undefined);

        await agentOperations.sendInput('agent-1', 'test input');

        expect(mockElectronAPI.sendAgentInput).toHaveBeenCalledWith('agent-1', 'test input');
      });
    });

    // agent-log-store-unification Task 4.2: loadAgentLogs tests removed
    // The loadAgentLogs method has been removed from agentOperations.
    // Log loading is now handled by shared/stores/agentStore.ensureLogsLoaded()
  });

  // =============================================================================
  // Task 2.3: setupAgentEventListeners関数実装
  // Requirements: 2.4, 2.5
  // =============================================================================
  describe('Task 2.3: setupAgentEventListeners', () => {
    // Bug fix: agent-log-json-display-issue
    // onAgentOutput listener was removed - parsed logs come via onAgentLog channel
    it('should NOT register onAgentOutput listener (removed for parsed log integration)', () => {
      mockElectronAPI.onAgentStatusChange.mockReturnValue(vi.fn());
      mockElectronAPI.onAgentRecordChanged.mockReturnValue(vi.fn());
      mockElectronAPI.onAgentLog.mockReturnValue(vi.fn());

      setupAgentEventListeners();

      expect(mockElectronAPI.onAgentOutput).not.toHaveBeenCalled();
    });

    it('should register onAgentStatusChange listener', () => {
      mockElectronAPI.onAgentStatusChange.mockReturnValue(vi.fn());
      mockElectronAPI.onAgentRecordChanged.mockReturnValue(vi.fn());
      mockElectronAPI.onAgentLog.mockReturnValue(vi.fn());

      setupAgentEventListeners();

      expect(mockElectronAPI.onAgentStatusChange).toHaveBeenCalled();
    });

    it('should register onAgentRecordChanged listener', () => {
      mockElectronAPI.onAgentStatusChange.mockReturnValue(vi.fn());
      mockElectronAPI.onAgentRecordChanged.mockReturnValue(vi.fn());
      mockElectronAPI.onAgentLog.mockReturnValue(vi.fn());

      setupAgentEventListeners();

      expect(mockElectronAPI.onAgentRecordChanged).toHaveBeenCalled();
    });

    // agent-log-store-unification Task 4.3: onAgentLog cleanup test updated
    // Log subscription cleanup is now handled by useAgentLogSubscription hook
    it('should return cleanup function that calls all cleanups', () => {
      const cleanupStatus = vi.fn();
      const cleanupRecord = vi.fn();

      mockElectronAPI.onAgentStatusChange.mockReturnValue(cleanupStatus);
      mockElectronAPI.onAgentRecordChanged.mockReturnValue(cleanupRecord);

      const cleanup = setupAgentEventListeners();
      cleanup();

      expect(cleanupStatus).toHaveBeenCalled();
      expect(cleanupRecord).toHaveBeenCalled();
    });

    it('should update agent status in shared store when onAgentStatusChange callback is invoked', () => {
      // First add an agent
      // agentId-unification: Use agentId instead of id
      const mockAgent = {
        agentId: 'agent-1',
        specId: 'spec-a',
        phase: 'requirements',
        status: 'running' as const,
        startedAt: new Date().toISOString(),
        command: 'claude',
      };
      useSharedAgentStore.getState().addAgent('spec-a', mockAgent);

      let statusCallback: ((agentId: string, status: string) => void) | null = null;
      mockElectronAPI.onAgentStatusChange.mockImplementation((cb) => {
        statusCallback = cb;
        return vi.fn();
      });
      mockElectronAPI.onAgentRecordChanged.mockReturnValue(vi.fn());
      mockElectronAPI.onAgentLog.mockReturnValue(vi.fn());

      setupAgentEventListeners();

      // Invoke the callback
      statusCallback?.('agent-1', 'completed');

      // Verify status was updated in shared store
      const state = getSharedAgentStore();
      const agent = state.getAgentById('agent-1');
      expect(agent?.status).toBe('completed');
    });

    // agent-log-store-unification Task 4.3: onAgentLog listener tests removed
    // Log subscription is now handled by useAgentLogSubscription hook in shared/hooks/
    // See useAgentLogSubscription.test.ts for log subscription tests
  });

  // =============================================================================
  // Task 2.4: skipPermissions管理をAdapterに移動
  // Requirements: 2.6
  // =============================================================================
  describe('Task 2.4: skipPermissions management', () => {
    describe('setSkipPermissions', () => {
      it('should call window.electronAPI.saveSkipPermissions', async () => {
        mockElectronAPI.saveSkipPermissions.mockResolvedValue(undefined);

        await skipPermissionsOperations.setSkipPermissions(true, '/project/path');

        expect(mockElectronAPI.saveSkipPermissions).toHaveBeenCalledWith('/project/path', true);
      });
    });

    describe('loadSkipPermissions', () => {
      it('should call window.electronAPI.loadSkipPermissions and return value', async () => {
        mockElectronAPI.loadSkipPermissions.mockResolvedValue(true);

        const result = await skipPermissionsOperations.loadSkipPermissions('/project/path');

        expect(mockElectronAPI.loadSkipPermissions).toHaveBeenCalledWith('/project/path');
        expect(result).toBe(true);
      });

      it('should return false on error', async () => {
        mockElectronAPI.loadSkipPermissions.mockRejectedValue(new Error('Failed'));

        const result = await skipPermissionsOperations.loadSkipPermissions('/project/path');

        expect(result).toBe(false);
      });
    });
  });
});
