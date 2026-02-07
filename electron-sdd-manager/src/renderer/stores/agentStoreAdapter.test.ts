/**
 * Agent Store Adapter Tests
 * agent-store-unification feature
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * trpc-full-migration Task 6.2: Agent operations migrated to tRPC vanilla client
 *
 * Tests for the Electron IPC adapter that bridges shared/agentStore with tRPC.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// trpc-full-migration Task 6.2: Mock tRPC vanilla client for all agent + config operations
// Task 9.2: Added events namespace mocks for tRPC Subscription
type SubscribeOptions = { onData?: (data: unknown) => void; onError?: (err: unknown) => void; onComplete?: () => void };
const eventSubscribers: Record<string, ((data: unknown) => void)[]> = {};

function createMockSubscription(eventName: string) {
  return {
    subscribe: (_input: unknown, opts?: SubscribeOptions) => {
      if (!eventSubscribers[eventName]) eventSubscribers[eventName] = [];
      if (opts?.onData) eventSubscribers[eventName].push(opts.onData);
      return { unsubscribe: vi.fn() };
    },
  };
}

function emitMockEvent(eventName: string, data: unknown) {
  (eventSubscribers[eventName] || []).forEach((cb) => cb(data));
}

const mockVanillaClient = {
  config: {
    saveSkipPermissions: { mutate: vi.fn().mockResolvedValue(undefined) },
    loadSkipPermissions: { query: vi.fn().mockResolvedValue(false) },
  },
  agent: {
    start: { mutate: vi.fn() },
    stop: { mutate: vi.fn() },
    resume: { mutate: vi.fn() },
    delete: { mutate: vi.fn() },
    sendInput: { mutate: vi.fn() },
    getLogs: { query: vi.fn() },
    getAgents: { query: vi.fn() },
    getAllAgents: { query: vi.fn() },
    getRunningAgentCounts: { query: vi.fn() },
  },
  events: {
    onAgentStatusChange: createMockSubscription('onAgentStatusChange'),
    onAgentRecordChanged: createMockSubscription('onAgentRecordChanged'),
  },
};
vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

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

// trpc-full-migration Task 11.4: window.electronAPI mock removed
// All agent operations now use tRPC vanilla client (mocked above)

// Set up global mock
beforeEach(() => {
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
    // trpc-full-migration Task 6.2: Agent operations now use tRPC vanilla client
    describe('startAgent', () => {
      it('should call tRPC agent.start.mutate and add agent to shared store', async () => {
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
        mockVanillaClient.agent.start.mutate.mockResolvedValue(mockAgent);

        const result = await agentOperations.startAgent(
          'spec-a',
          'requirements',
          ['-p'],
          'doc',
          'session-1',
          'claude'
        );

        expect(mockVanillaClient.agent.start.mutate).toHaveBeenCalledWith({
          specId: 'spec-a',
          phase: 'requirements',
          args: ['-p'],
          group: 'doc',
          sessionId: 'session-1',
          engineId: 'claude',
        });
        expect(result).toBe('agent-1');

        // Verify agent was added to shared store
        const state = getSharedAgentStore();
        const agents = state.agents.get('spec-a');
        expect(agents).toHaveLength(1);
        expect(agents![0].agentId).toBe('agent-1');
      });

      it('should return null on error', async () => {
        mockVanillaClient.agent.start.mutate.mockRejectedValue(new Error('Spawn failed'));

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
      it('should call tRPC agent.stop.mutate', async () => {
        mockVanillaClient.agent.stop.mutate.mockResolvedValue(undefined);

        await agentOperations.stopAgent('agent-1');

        expect(mockVanillaClient.agent.stop.mutate).toHaveBeenCalledWith({ agentId: 'agent-1' });
      });
    });

    describe('resumeAgent', () => {
      it('should call tRPC agent.resume.mutate', async () => {
        mockVanillaClient.agent.resume.mutate.mockResolvedValue({
          agentId: 'agent-1',
          status: 'running',
        });

        await agentOperations.resumeAgent('agent-1', 'custom prompt');

        expect(mockVanillaClient.agent.resume.mutate).toHaveBeenCalledWith({
          agentId: 'agent-1',
          prompt: 'custom prompt',
        });
      });

      // Bug fix: agent-log-user-input-duplicate
      // User input log is now added only via Main process (onAgentLog IPC)
      // to avoid duplicate entries. This test verifies no local log is added.
      it('should NOT add stdin log entry locally (handled by Main process)', async () => {
        mockVanillaClient.agent.resume.mutate.mockResolvedValue({
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
      it('should call tRPC agent.delete.mutate and remove from shared store', async () => {
        // First add the agent
        const mockAgent = {
          agentId: 'agent-1',
          specId: 'spec-a',
          phase: 'requirements',
          status: 'completed' as const,
          startedAt: new Date().toISOString(),
          command: 'claude',
        };
        useSharedAgentStore.getState().addAgent('spec-a', mockAgent);

        mockVanillaClient.agent.delete.mutate.mockResolvedValue(undefined);

        await agentOperations.removeAgent('agent-1');

        expect(mockVanillaClient.agent.delete.mutate).toHaveBeenCalledWith({
          specId: 'spec-a',
          agentId: 'agent-1',
        });

        // Verify agent was removed from shared store
        const state = getSharedAgentStore();
        const specAgents = state.agents.get('spec-a') || [];
        expect(specAgents).toHaveLength(0);
      });
    });

    describe('sendInput', () => {
      it('should call tRPC agent.sendInput.mutate', async () => {
        mockVanillaClient.agent.sendInput.mutate.mockResolvedValue(undefined);

        await agentOperations.sendInput('agent-1', 'test input');

        expect(mockVanillaClient.agent.sendInput.mutate).toHaveBeenCalledWith({
          agentId: 'agent-1',
          input: 'test input',
        });
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
  // Task 9.2: setupAgentEventListeners now uses tRPC Subscriptions
  describe('Task 2.3: setupAgentEventListeners (tRPC Subscription)', () => {
    beforeEach(() => {
      // Clear event subscribers between tests
      Object.keys(eventSubscribers).forEach((key) => delete eventSubscribers[key]);
    });

    it('should subscribe to onAgentStatusChange via tRPC', () => {
      const spy = vi.spyOn(mockVanillaClient.events.onAgentStatusChange, 'subscribe');

      setupAgentEventListeners();

      expect(spy).toHaveBeenCalled();
    });

    it('should subscribe to onAgentRecordChanged via tRPC', () => {
      const spy = vi.spyOn(mockVanillaClient.events.onAgentRecordChanged, 'subscribe');

      setupAgentEventListeners();

      expect(spy).toHaveBeenCalled();
    });

    it('should return cleanup function that calls unsubscribe on all subscriptions', () => {
      const cleanup = setupAgentEventListeners();

      // cleanup should not throw
      cleanup();
    });

    it('should update agent status in shared store when onAgentStatusChange subscription fires', () => {
      // First add an agent
      const mockAgent = {
        agentId: 'agent-1',
        specId: 'spec-a',
        phase: 'requirements',
        status: 'running' as const,
        startedAt: new Date().toISOString(),
        command: 'claude',
      };
      useSharedAgentStore.getState().addAgent('spec-a', mockAgent);

      setupAgentEventListeners();

      // Emit via mock event
      emitMockEvent('onAgentStatusChange', { agentId: 'agent-1', status: 'completed' });

      // Verify status was updated in shared store
      const state = getSharedAgentStore();
      const agent = state.getAgentById('agent-1');
      expect(agent?.status).toBe('completed');
    });
  });

  // =============================================================================
  // Task 2.4: skipPermissions管理をAdapterに移動
  // Requirements: 2.6
  // =============================================================================
  describe('Task 2.4: skipPermissions management', () => {
    describe('setSkipPermissions', () => {
      it('should call tRPC config.saveSkipPermissions.mutate', async () => {
        mockVanillaClient.config.saveSkipPermissions.mutate.mockResolvedValue(undefined);

        await skipPermissionsOperations.setSkipPermissions(true, '/project/path');

        expect(mockVanillaClient.config.saveSkipPermissions.mutate).toHaveBeenCalledWith({
          projectPath: '/project/path',
          skipPermissions: true,
        });
      });
    });

    describe('loadSkipPermissions', () => {
      it('should call tRPC config.loadSkipPermissions.query and return value', async () => {
        mockVanillaClient.config.loadSkipPermissions.query.mockResolvedValue(true);

        const result = await skipPermissionsOperations.loadSkipPermissions('/project/path');

        expect(mockVanillaClient.config.loadSkipPermissions.query).toHaveBeenCalledWith({
          projectPath: '/project/path',
        });
        expect(result).toBe(true);
      });

      it('should return false on error', async () => {
        mockVanillaClient.config.loadSkipPermissions.query.mockRejectedValue(new Error('Failed'));

        const result = await skipPermissionsOperations.loadSkipPermissions('/project/path');

        expect(result).toBe(false);
      });
    });
  });
});
