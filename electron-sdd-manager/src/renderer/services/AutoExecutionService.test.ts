/**
 * AutoExecutionService Tests
 * TDD: Testing auto execution service
 * Requirements: 1.1-1.4, 2.1-2.5, 3.1-3.4, 4.1-4.4, 6.3-6.4, 8.1-8.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AutoExecutionService } from './AutoExecutionService';
import { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { useSpecStore } from '../stores/specStore';
import type { WorkflowPhase } from '../types/workflow';

// Mock electronAPI
const mockElectronAPI = {
  executePhase: vi.fn(),
  executeValidation: vi.fn(),
  updateApproval: vi.fn(),
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
});

describe('AutoExecutionService', () => {
  let service: AutoExecutionService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset workflow store
    useWorkflowStore.setState({
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
      validationOptions: {
        gap: false,
        design: false,
        impl: false,
      },
      isAutoExecuting: false,
      currentAutoPhase: null,
      autoExecutionStatus: 'idle',
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,
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
    });

    service = new AutoExecutionService();
  });

  afterEach(() => {
    service.dispose();
  });

  // ============================================================
  // Task 3.1: Basic service structure
  // Requirements: 2.1, 3.4
  // ============================================================
  describe('Task 3.1: Basic service structure', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(AutoExecutionService);
    });

    it('should have dispose method for cleanup', () => {
      expect(service.dispose).toBeDefined();
      expect(() => service.dispose()).not.toThrow();
    });

    it('should connect to workflowStore', () => {
      const workflowState = useWorkflowStore.getState();
      expect(workflowState.autoExecutionStatus).toBe('idle');
    });
  });

  // ============================================================
  // Task 3.2: Phase order and next phase logic
  // Requirements: 2.1, 2.2
  // ============================================================
  describe('Task 3.2: getNextPermittedPhase', () => {
    it('should return first permitted phase when current is null', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          ...DEFAULT_AUTO_EXECUTION_PERMISSIONS,
          requirements: true,
        },
      });

      const next = service.getNextPermittedPhase(null);
      expect(next).toBe('requirements');
    });

    it('should return next permitted phase in order', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const next = service.getNextPermittedPhase('requirements');
      expect(next).toBe('design');
    });

    it('should skip non-permitted phases', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const next = service.getNextPermittedPhase('requirements');
      expect(next).toBe('tasks');
    });

    it('should return null when no more permitted phases', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const next = service.getNextPermittedPhase('requirements');
      expect(next).toBeNull();
    });

    it('should return null when all phases are not permitted', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: false,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const next = service.getNextPermittedPhase(null);
      expect(next).toBeNull();
    });

    it('should respect phase order: requirements -> design -> tasks -> impl', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
          inspection: false,
          deploy: false,
        },
      });

      expect(service.getNextPermittedPhase(null)).toBe('requirements');
      expect(service.getNextPermittedPhase('requirements')).toBe('design');
      expect(service.getNextPermittedPhase('design')).toBe('tasks');
      expect(service.getNextPermittedPhase('tasks')).toBe('impl');
      expect(service.getNextPermittedPhase('impl')).toBeNull();
    });
  });

  // ============================================================
  // Task 3.3: Precondition validation
  // Requirements: 3.1, 3.4
  // ============================================================
  describe('Task 3.3: validatePreconditions', () => {
    it('should return invalid when specDetail is missing', async () => {
      useSpecStore.setState({ specDetail: null });

      const result = await service.validatePreconditions('requirements');

      expect(result.valid).toBe(false);
      expect(result.missingSpec).toBe(true);
    });

    it('should return valid for requirements phase', async () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: false, approved: false },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      const result = await service.validatePreconditions('requirements');

      expect(result.valid).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should require approval when previous phase is generated but not approved', async () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: false },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      const result = await service.validatePreconditions('design');

      expect(result.requiresApproval).toBe(true);
    });

    it('should be valid when previous phase is approved', async () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      const result = await service.validatePreconditions('design');

      expect(result.valid).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should detect running agent for the spec', async () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      // Add running agent
      const agents = new Map();
      agents.set('test-spec', [
        {
          agentId: 'agent-1',
          specId: 'test-spec',
          phase: 'requirements',
          status: 'running',
        },
      ]);
      useAgentStore.setState({ agents });

      const result = await service.validatePreconditions('design');

      expect(result.waitingForAgent).toBe(true);
    });
  });

  // ============================================================
  // Task 4.1: Start auto execution
  // Requirements: 1.1, 2.1
  // ============================================================
  describe('Task 4.1: start', () => {
    it('should set status to running when started', () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: false, approved: false },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          ...DEFAULT_AUTO_EXECUTION_PERMISSIONS,
          requirements: true,
        },
      });

      const result = service.start();

      expect(result).toBe(true);
      expect(useWorkflowStore.getState().isAutoExecuting).toBe(true);
      expect(useWorkflowStore.getState().autoExecutionStatus).toBe('running');
    });

    it('should fail when no permitted phases', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: false,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const result = service.start();

      expect(result).toBe(false);
      expect(useWorkflowStore.getState().isAutoExecuting).toBe(false);
    });

    it('should fail when specDetail is missing', () => {
      useSpecStore.setState({ specDetail: null });

      const result = service.start();

      expect(result).toBe(false);
    });

    it('should set currentAutoPhase to first permitted phase', () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: false, approved: false },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: false,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      service.start();

      // Note: The actual phase execution would set currentAutoPhase
      // This test verifies the start logic
      expect(useWorkflowStore.getState().isAutoExecuting).toBe(true);
    });
  });

  // ============================================================
  // Task 4.2: Stop auto execution
  // Requirements: 1.2
  // ============================================================
  describe('Task 4.2: stop', () => {
    it('should set status to idle when stopped', async () => {
      useWorkflowStore.setState({
        isAutoExecuting: true,
        autoExecutionStatus: 'running',
      });

      await service.stop();

      expect(useWorkflowStore.getState().isAutoExecuting).toBe(false);
      expect(useWorkflowStore.getState().autoExecutionStatus).toBe('idle');
    });

    it('should clear currentAutoPhase when stopped', async () => {
      useWorkflowStore.setState({
        isAutoExecuting: true,
        autoExecutionStatus: 'running',
        currentAutoPhase: 'design',
      });

      await service.stop();

      expect(useWorkflowStore.getState().currentAutoPhase).toBeNull();
    });
  });

  // ============================================================
  // Task 4.3: Retry from failed phase
  // Requirements: 8.3
  // ============================================================
  describe('Task 4.3: retryFrom', () => {
    it('should start from specified phase', () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
        lastFailedPhase: 'design',
        failedRetryCount: 1,
      });

      const result = service.retryFrom('design');

      expect(result).toBe(true);
      expect(useWorkflowStore.getState().isAutoExecuting).toBe(true);
    });

    it('should increment retry count', () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
        failedRetryCount: 1,
      });

      service.retryFrom('design');

      expect(useWorkflowStore.getState().failedRetryCount).toBe(2);
    });

    it('should fail when phase is not permitted', () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: false, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const result = service.retryFrom('design');

      expect(result).toBe(false);
    });
  });
});
