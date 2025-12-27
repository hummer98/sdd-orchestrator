/**
 * AutoExecutionService Parallel Execution Tests
 * TDD tests for parallel spec execution support
 * Requirements: 1.1-1.4, 2.1-2.6, 3.1-3.6, 4.1-4.5, 6.1-6.5, 7.1-7.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AutoExecutionService } from './AutoExecutionService';
import { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { useSpecStore } from '../stores/specStore';
import type { SpecDetail } from '../types/index';

// Mock electronAPI
const mockElectronAPI = {
  executePhase: vi.fn(),
  executeValidation: vi.fn(),
  updateApproval: vi.fn(),
  readSpecJson: vi.fn(),
  onAgentStatusChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
  executeDocumentReview: vi.fn(),
  executeDocumentReviewReply: vi.fn(),
  approveDocumentReview: vi.fn(),
  parseReplyFile: vi.fn(),
  updateSpecJson: vi.fn(),
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
});

// Helper to create mock SpecDetail
function createMockSpecDetail(specId: string, path: string): SpecDetail {
  return {
    metadata: {
      name: specId,
      path,
      phase: 'initialized',
      updatedAt: new Date().toISOString(),
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
    },
    specJson: {
      feature_name: specId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      language: 'ja',
      phase: 'initialized',
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
    },
    artifacts: {
      requirements: null,
      design: null,
      tasks: null,
      research: null,
      inspection: null,
    },
    taskProgress: null,
  };
}

describe('AutoExecutionService Parallel Execution', () => {
  let service: AutoExecutionService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset workflow store
    useWorkflowStore.setState({
      autoExecutionPermissions: {
        requirements: true,
        design: true,
        tasks: true,
        impl: false,
        inspection: false,
        deploy: false,
      },
      validationOptions: {
        gap: false,
        design: false,
        impl: false,
      },
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,
      documentReviewOptions: {
        autoExecutionFlag: 'skip',
      },
    });

    // Reset agent store
    useAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      logs: new Map(),
      isLoading: false,
      error: null,
    });

    // Reset spec store
    useSpecStore.setState({
      specs: [],
      selectedSpec: null,
      specDetail: null,
      isLoading: false,
      error: null,
      specManagerExecution: {
        isRunning: false,
        currentPhase: null,
        currentSpecId: null,
        lastCheckResult: null,
        error: null,
        implTaskStatus: null,
        retryCount: 0,
        executionMode: null,
      },
      autoExecutionRuntimeMap: new Map(),
    });

    service = new AutoExecutionService();
  });

  afterEach(() => {
    service.dispose();
  });

  // ============================================================
  // Task 2.1: Internal State Management - Map-based
  // Requirements: 1.1, 2.1
  // ============================================================
  describe('Task 2.1: Map-based internal state management', () => {
    it('should expose getExecutionContext method', () => {
      expect(typeof service.getExecutionContext).toBe('function');
    });

    it('should return undefined for non-existent specId', () => {
      const context = service.getExecutionContext('non-existent');
      expect(context).toBeUndefined();
    });

    it('should expose getActiveExecutionCount method', () => {
      expect(typeof service.getActiveExecutionCount).toBe('function');
    });

    it('should return 0 when no executions are active', () => {
      expect(service.getActiveExecutionCount()).toBe(0);
    });

    it('should expose isExecuting method', () => {
      expect(typeof service.isExecuting).toBe('function');
    });

    it('should return false for non-executing spec', () => {
      expect(service.isExecuting('non-existent')).toBe(false);
    });
  });

  // ============================================================
  // Task 2.2: Concurrent execution limit check
  // Requirements: 3.4, 3.5
  // ============================================================
  describe('Task 2.2: Concurrent execution limit', () => {
    it('should allow up to 5 concurrent executions', async () => {
      // Set up 5 specs with proper specDetail
      for (let i = 1; i <= 5; i++) {
        const specDetail = createMockSpecDetail(`spec-${i}`, `/path/spec-${i}`);
        useSpecStore.setState({ specDetail });
        mockElectronAPI.executePhase.mockResolvedValue({ agentId: `agent-${i}` });
        mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

        const result = service.start();
        expect(result).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(service.getActiveExecutionCount()).toBe(5);
    });

    it('should reject 6th concurrent execution', async () => {
      // Set up 5 specs
      for (let i = 1; i <= 5; i++) {
        const specDetail = createMockSpecDetail(`spec-${i}`, `/path/spec-${i}`);
        useSpecStore.setState({ specDetail });
        mockElectronAPI.executePhase.mockResolvedValue({ agentId: `agent-${i}` });
        mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

        service.start();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Try 6th spec
      const specDetail6 = createMockSpecDetail('spec-6', '/path/spec-6');
      useSpecStore.setState({ specDetail: specDetail6 });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail6.specJson);

      const result = service.start();
      expect(result).toBe(false);
    });

    it('should prevent duplicate execution of same specId', async () => {
      const specDetail = createMockSpecDetail('spec-1', '/path/spec-1');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      const result1 = service.start();
      expect(result1).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Try to start same spec again
      const result2 = service.start();
      expect(result2).toBe(false);
    });
  });

  // ============================================================
  // Task 3.1: start() with ExecutionContext creation
  // Requirements: 1.2, 1.4, 1.5, 3.1
  // ============================================================
  describe('Task 3.1: start() creates ExecutionContext', () => {
    it('should create ExecutionContext with specDetail snapshot', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      const result = service.start();
      expect(result).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const context = service.getExecutionContext('test-spec');
      expect(context).toBeDefined();
      expect(context?.specId).toBe('test-spec');
      expect(context?.specPath).toBe('/test/path');
      expect(context?.specDetailSnapshot).toBeDefined();
    });

    it('should set isExecuting to true for the spec', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(service.isExecuting('test-spec')).toBe(true);
    });

    it('should increment active execution count', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      expect(service.getActiveExecutionCount()).toBe(0);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(service.getActiveExecutionCount()).toBe(1);
    });
  });

  // ============================================================
  // Task 3.2: AgentId to SpecId mapping
  // Requirements: 2.2
  // ============================================================
  describe('Task 3.2: AgentId to SpecId mapping', () => {
    it('should register agentId after executePhase returns', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-123' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Agent should be tracked
      expect(service.isTrackedAgent('agent-123')).toBe(true);
    });

    it('should track agentId in the correct ExecutionContext', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-123' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const context = service.getExecutionContext('test-spec');
      expect(context?.trackedAgentIds.has('agent-123')).toBe(true);
    });
  });

  // ============================================================
  // Task 4: Agent completion event handling
  // Requirements: 1.3, 2.3, 2.4
  // ============================================================
  describe('Task 4: Agent completion event handling', () => {
    it('should resolve specId from agentId on completion event', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-123' });
      mockElectronAPI.readSpecJson.mockResolvedValue({
        ...specDetail.specJson,
        approvals: {
          requirements: { generated: true, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      });
      mockElectronAPI.updateApproval.mockResolvedValue(undefined);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Get the specId for the agent
      const specId = service.getSpecIdForAgent('agent-123');
      expect(specId).toBe('test-spec');
    });

    it('should buffer events for unknown agentIds', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check debug info for pending events
      const debugInfo = service.getDebugInfo();
      expect(debugInfo.pendingEvents).toBeDefined();
    });
  });

  // ============================================================
  // Task 7.2: stop() with specId parameter
  // Requirements: 6.3, 7.1
  // ============================================================
  describe('Task 7.2: stop() with specId parameter', () => {
    it('should stop specific spec when specId is provided', async () => {
      // Start two specs
      const specDetail1 = createMockSpecDetail('spec-1', '/path/spec-1');
      useSpecStore.setState({ specDetail: specDetail1 });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail1.specJson);
      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const specDetail2 = createMockSpecDetail('spec-2', '/path/spec-2');
      useSpecStore.setState({ specDetail: specDetail2 });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-2' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail2.specJson);
      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(service.getActiveExecutionCount()).toBe(2);

      // Stop only spec-1
      await service.stop('spec-1');

      expect(service.isExecuting('spec-1')).toBe(false);
      expect(service.isExecuting('spec-2')).toBe(true);
      expect(service.getActiveExecutionCount()).toBe(1);
    });

    it('should clean up ExecutionContext immediately on stop', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(service.getExecutionContext('test-spec')).toBeDefined();

      await service.stop('test-spec');

      expect(service.getExecutionContext('test-spec')).toBeUndefined();
    });

    it('should clean up agentToSpecMap entries on stop', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-123' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(service.isTrackedAgent('agent-123')).toBe(true);

      await service.stop('test-spec');

      expect(service.isTrackedAgent('agent-123')).toBe(false);
    });
  });

  // ============================================================
  // Task 7.3: dispose() cleans up all contexts
  // Requirements: 6.4
  // ============================================================
  describe('Task 7.3: dispose() cleans up all contexts', () => {
    it('should clear all ExecutionContexts on dispose', async () => {
      // Start multiple specs
      for (let i = 1; i <= 3; i++) {
        const specDetail = createMockSpecDetail(`spec-${i}`, `/path/spec-${i}`);
        useSpecStore.setState({ specDetail });
        mockElectronAPI.executePhase.mockResolvedValue({ agentId: `agent-${i}` });
        mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);
        service.start();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(service.getActiveExecutionCount()).toBe(3);

      service.dispose();

      expect(service.getActiveExecutionCount()).toBe(0);
    });
  });

  // ============================================================
  // Task 7.4: forceCleanupAll() for testing
  // Requirements: 6.5
  // ============================================================
  describe('Task 7.4: forceCleanupAll() for testing', () => {
    it('should expose forceCleanupAll method', () => {
      expect(typeof service.forceCleanupAll).toBe('function');
    });

    it('should reset all state without disposing', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(service.getActiveExecutionCount()).toBe(1);

      service.forceCleanupAll();

      expect(service.getActiveExecutionCount()).toBe(0);

      // Service should still be usable after forceCleanupAll
      useSpecStore.setState({ specDetail });
      const result = service.start();
      expect(result).toBe(true);
    });
  });

  // ============================================================
  // Task 8.1: retryFrom() with specId parameter
  // Requirements: 6.2, 7.1
  // ============================================================
  describe('Task 8.1: retryFrom() with specId parameter', () => {
    it('should retry specific spec when specId is provided', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      // Start and simulate error
      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Retry from requirements
      const result = service.retryFrom('requirements', 'test-spec');
      expect(result).toBe(true);
    });

    it('should use current specId when none provided', async () => {
      const specDetail = createMockSpecDetail('test-spec', '/test/path');
      useSpecStore.setState({ specDetail });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-1' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetail.specJson);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = service.retryFrom('requirements');
      expect(result).toBe(true);
    });
  });

  // ============================================================
  // Task 11.5: Context independence test
  // Requirements: 3.1, 3.2, 3.3, 3.6
  // ============================================================
  describe('Task 11.5: Context independence', () => {
    it('should keep Spec B running when Spec A errors', async () => {
      // Start Spec A
      const specDetailA = createMockSpecDetail('spec-a', '/path/spec-a');
      useSpecStore.setState({ specDetail: specDetailA });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-a' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetailA.specJson);
      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Start Spec B
      const specDetailB = createMockSpecDetail('spec-b', '/path/spec-b');
      useSpecStore.setState({ specDetail: specDetailB });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-b' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetailB.specJson);
      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(service.isExecuting('spec-a')).toBe(true);
      expect(service.isExecuting('spec-b')).toBe(true);

      // Stop Spec A due to error (simulated)
      await service.stop('spec-a');

      expect(service.isExecuting('spec-a')).toBe(false);
      expect(service.isExecuting('spec-b')).toBe(true);
    });

    it('should update only target context when phase completes', async () => {
      // Start two specs
      const specDetailA = createMockSpecDetail('spec-a', '/path/spec-a');
      useSpecStore.setState({ specDetail: specDetailA });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-a' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetailA.specJson);
      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const specDetailB = createMockSpecDetail('spec-b', '/path/spec-b');
      useSpecStore.setState({ specDetail: specDetailB });
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-b' });
      mockElectronAPI.readSpecJson.mockResolvedValue(specDetailB.specJson);
      service.start();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Both should be running independently
      const contextA = service.getExecutionContext('spec-a');
      const contextB = service.getExecutionContext('spec-b');

      expect(contextA?.specId).toBe('spec-a');
      expect(contextB?.specId).toBe('spec-b');
      expect(contextA).not.toBe(contextB);
    });
  });
});
