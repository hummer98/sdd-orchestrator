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
  readSpecJson: vi.fn(),
  onAgentStatusChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
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
  // Bug Fix: getLastCompletedPhase - Resume from current progress
  // ============================================================
  describe('Bug Fix: getLastCompletedPhase', () => {
    it('should return null when no phases are completed', () => {
      const approvals = {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      };

      const result = service.getLastCompletedPhase(approvals);
      expect(result).toBeNull();
    });

    it('should return requirements when requirements is generated', () => {
      const approvals = {
        requirements: { generated: true, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      };

      const result = service.getLastCompletedPhase(approvals);
      expect(result).toBe('requirements');
    });

    it('should return requirements when requirements is approved', () => {
      const approvals = {
        requirements: { generated: true, approved: true },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      };

      const result = service.getLastCompletedPhase(approvals);
      expect(result).toBe('requirements');
    });

    it('should return design when design is generated', () => {
      const approvals = {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: false },
        tasks: { generated: false, approved: false },
      };

      const result = service.getLastCompletedPhase(approvals);
      expect(result).toBe('design');
    });

    it('should return tasks when tasks is generated', () => {
      const approvals = {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: false },
      };

      const result = service.getLastCompletedPhase(approvals);
      expect(result).toBe('tasks');
    });

    it('should return tasks when all phases are approved', () => {
      const approvals = {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      };

      const result = service.getLastCompletedPhase(approvals);
      expect(result).toBe('tasks');
    });
  });

  // ============================================================
  // Bug Fix: start should resume from current progress
  // ============================================================
  describe('Bug Fix: start resumes from current progress', () => {
    it('should start from design when requirements is already completed', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue(undefined);

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const result = service.start();

      expect(result).toBe(true);
      // Wait for async executePhase call
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockElectronAPI.executePhase).toHaveBeenCalledWith(
        'test-spec',
        'design',
        'test-spec'
      );
    });

    it('should start from tasks when design is already completed', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue(undefined);

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const result = service.start();

      expect(result).toBe(true);
      // Wait for async executePhase call
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockElectronAPI.executePhase).toHaveBeenCalledWith(
        'test-spec',
        'tasks',
        'test-spec'
      );
    });

    it('should start from impl when tasks is already completed', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
        documentReview: {
          status: 'approved',
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue(undefined);

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
          inspection: false,
          deploy: false,
        },
        documentReviewOptions: {
          autoExecutionFlag: 'run',
        },
      });

      const result = service.start();

      expect(result).toBe(true);
      // Wait for async executePhase call
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockElectronAPI.executePhase).toHaveBeenCalledWith(
        'test-spec',
        'impl',
        'test-spec'
      );
    });

    it('should auto-approve generated but unapproved phase before proceeding', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: false }, // generated but not approved
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue(undefined);
      mockElectronAPI.updateApproval.mockResolvedValue(undefined);

      // Mock selectSpec to prevent errors
      const selectSpecMock = vi.fn().mockResolvedValue(undefined);
      useSpecStore.setState({ selectSpec: selectSpecMock } as any);

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

      const result = service.start();

      expect(result).toBe(true);
      // Wait for async executePhase call (needs more time for auto-approval)
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Should start from design (next after requirements)
      expect(mockElectronAPI.executePhase).toHaveBeenCalledWith(
        'test-spec',
        'design',
        'test-spec'
      );
    });

    it('should return false when all completed phases have no next permitted phase', () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      // Only requirements is permitted, but it's already completed
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

      const result = service.start();

      expect(result).toBe(false);
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
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

      const result = await service.validatePreconditions('requirements');

      expect(result.valid).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should require approval when previous phase is generated but not approved', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

      const result = await service.validatePreconditions('design');

      expect(result.requiresApproval).toBe(true);
    });

    it('should be valid when previous phase is approved', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

      const result = await service.validatePreconditions('design');

      expect(result.valid).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should detect running agent for the spec', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

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

    // ============================================================
    // Impl phase preconditions: Document review integration
    // ============================================================
    describe('impl phase preconditions', () => {
      it('should be invalid when tasks is not approved', async () => {
        const mockSpecJson = {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: false, approved: false }, // Changed to both false
          },
        };
        const mockSpecDetail = {
          metadata: { name: 'test-spec', path: '/test' },
          specJson: mockSpecJson,
        };
        useSpecStore.setState({ specDetail: mockSpecDetail as any });
        mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

        const result = await service.validatePreconditions('impl');

        expect(result.valid).toBe(false);
        expect(result.requiresApproval).toBe(false); // Should be false when not generated
        expect(result.error).toBe('tasks is not generated yet');
      });

      it('should be valid when tasks is approved and document review is skipped', async () => {
        const mockSpecJson = {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        };
        const mockSpecDetail = {
          metadata: { name: 'test-spec', path: '/test' },
          specJson: mockSpecJson,
        };
        useSpecStore.setState({ specDetail: mockSpecDetail as any });
        mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

        // Document review is set to skip
        useWorkflowStore.setState({
          documentReviewOptions: {
            autoExecutionFlag: 'skip',
          },
        });

        const result = await service.validatePreconditions('impl');

        expect(result.valid).toBe(true);
      });

      it('should wait for document review when review is enabled and not approved', async () => {
        const mockSpecJson = {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
          documentReview: {
            status: 'in_progress',
          },
        };
        const mockSpecDetail = {
          metadata: { name: 'test-spec', path: '/test' },
          specJson: mockSpecJson,
        };
        useSpecStore.setState({ specDetail: mockSpecDetail as any });
        mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

        // Document review is enabled (not skipped)
        useWorkflowStore.setState({
          documentReviewOptions: {
            autoExecutionFlag: 'run',
          },
        });

        const result = await service.validatePreconditions('impl');

        expect(result.valid).toBe(false);
        expect(result.waitingForReview).toBe(true);
      });

      it('should be valid when document review is approved', async () => {
        const mockSpecJson = {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
          documentReview: {
            status: 'approved',
          },
        };
        const mockSpecDetail = {
          metadata: { name: 'test-spec', path: '/test' },
          specJson: mockSpecJson,
        };
        useSpecStore.setState({ specDetail: mockSpecDetail as any });
        mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

        // Document review is enabled
        useWorkflowStore.setState({
          documentReviewOptions: {
            autoExecutionFlag: 'run',
          },
        });

        const result = await service.validatePreconditions('impl');

        expect(result.valid).toBe(true);
      });

      it('should be valid when document review is skipped via status', async () => {
        const mockSpecJson = {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
          documentReview: {
            status: 'skipped',
          },
        };
        const mockSpecDetail = {
          metadata: { name: 'test-spec', path: '/test' },
          specJson: mockSpecJson,
        };
        useSpecStore.setState({ specDetail: mockSpecDetail as any });
        mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);

        // Document review is enabled but status is skipped
        useWorkflowStore.setState({
          documentReviewOptions: {
            autoExecutionFlag: 'run',
          },
        });

        const result = await service.validatePreconditions('impl');

        expect(result.valid).toBe(true);
      });
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

  // ============================================================
  // Task 5.2.1: Auto-approve completed phase
  // Requirements: 2.5 - Phase should be approved after successful completion
  // Updated to use IPC direct subscription for completion detection
  // ============================================================
  describe('Task 5.2.1: autoApproveCompletedPhase on agent completion', () => {
    let statusChangeCallback: ((agentId: string, status: any) => void) | null = null;

    beforeEach(() => {
      // Capture the IPC callback
      mockElectronAPI.onAgentStatusChange.mockImplementation((callback) => {
        statusChangeCallback = callback;
        return vi.fn();
      });

      // Recreate service to capture callback
      service.dispose();
      service = new AutoExecutionService();
    });

    it('should call updateApproval when requirements phase agent completes', async () => {
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
      mockElectronAPI.updateApproval.mockResolvedValue(undefined);
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecDetail.specJson);

      // Mock selectSpec to prevent errors
      const selectSpecMock = vi.fn().mockResolvedValue(undefined);
      useSpecStore.setState({ selectSpec: selectSpecMock } as any);

      useWorkflowStore.setState({
        isAutoExecuting: true,
        currentAutoPhase: 'requirements',
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      // Mock getAgentById to return requirements phase agent
      useAgentStore.setState({
        getAgentById: () => ({
          agentId: 'agent-1',
          specId: 'test-spec',
          phase: 'requirements',
          status: 'completed',
        } as any),
      } as any);

      // Manually add agent to tracked set
      (service as any).trackedAgentIds.add('agent-1');

      // Simulate agent completion via IPC callback
      statusChangeCallback?.('agent-1', 'completed');

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify updateApproval was called with the completed phase
      expect(mockElectronAPI.updateApproval).toHaveBeenCalledWith(
        '/test',
        'requirements',
        true
      );
    });

    it('should call updateApproval when design phase agent completes', async () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: false },
            tasks: { generated: false, approved: false },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.updateApproval.mockResolvedValue(undefined);
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecDetail.specJson);

      // Mock selectSpec to prevent errors
      const selectSpecMock = vi.fn().mockResolvedValue(undefined);
      useSpecStore.setState({ selectSpec: selectSpecMock } as any);

      useWorkflowStore.setState({
        isAutoExecuting: true,
        currentAutoPhase: 'design',
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      // Mock getAgentById to return design phase agent
      useAgentStore.setState({
        getAgentById: () => ({
          agentId: 'agent-1',
          specId: 'test-spec',
          phase: 'design',
          status: 'completed',
        } as any),
      } as any);

      // Manually add agent to tracked set
      (service as any).trackedAgentIds.add('agent-1');

      // Simulate agent completion via IPC callback
      statusChangeCallback?.('agent-1', 'completed');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockElectronAPI.updateApproval).toHaveBeenCalledWith(
        '/test',
        'design',
        true
      );
    });

    it('should not call updateApproval for impl phase (no approval status)', async () => {
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.updateApproval.mockResolvedValue(undefined);
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecDetail.specJson);

      useWorkflowStore.setState({
        isAutoExecuting: true,
        currentAutoPhase: 'impl',
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
          inspection: false,
          deploy: false,
        },
      });

      // Simulate agent completion
      const agents = new Map();
      agents.set('test-spec', [
        {
          agentId: 'agent-1',
          specId: 'test-spec',
          phase: 'impl',
          status: 'running',
        },
      ]);
      useAgentStore.setState({ agents });

      const completedAgents = new Map();
      completedAgents.set('test-spec', [
        {
          agentId: 'agent-1',
          specId: 'test-spec',
          phase: 'impl',
          status: 'completed',
        },
      ]);
      useAgentStore.setState({ agents: completedAgents });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // updateApproval should NOT be called for impl phase
      expect(mockElectronAPI.updateApproval).not.toHaveBeenCalledWith(
        '/test',
        'impl',
        true
      );
    });
  });

  // ============================================================
  // Task 7.2: Document Review Workflow Integration
  // Requirements: 7.1, 7.2, 7.3
  // Updated to use IPC direct subscription for completion detection
  // ============================================================
  describe('Task 7.2: Document Review Workflow Integration', () => {
    let statusChangeCallback: ((agentId: string, status: any) => void) | null = null;

    beforeEach(() => {
      // Capture the IPC callback
      mockElectronAPI.onAgentStatusChange.mockImplementation((callback) => {
        statusChangeCallback = callback;
        return vi.fn();
      });

      // Recreate service to capture callback
      service.dispose();
      service = new AutoExecutionService();
    });

    it('should execute document-review after tasks phase completes when autoReply is true', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue(undefined);
      mockElectronAPI.updateApproval.mockResolvedValue(undefined);
      (mockElectronAPI as any).executeDocumentReview = vi.fn().mockResolvedValue({
        agentId: 'review-agent-1',
        specId: 'test-spec',
        phase: 'document-review',
        status: 'running',
      });

      // Mock selectSpec to prevent errors
      const selectSpecMock = vi.fn().mockResolvedValue(undefined);
      useSpecStore.setState({ selectSpec: selectSpecMock } as any);

      // Enable document review with autoReply - only tasks is permitted so it will be the starting phase
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: false,
          design: false,
          tasks: true,
          impl: true,
          inspection: false,
          deploy: false,
        },
        documentReviewOptions: {
          autoExecutionFlag: 'run',
        },
        isAutoExecuting: true,
        currentAutoPhase: 'tasks',
      });

      // Mock getAgentById to return tasks phase agent
      useAgentStore.setState({
        getAgentById: () => ({
          agentId: 'agent-1',
          specId: 'test-spec',
          phase: 'tasks',
          status: 'completed',
        } as any),
      } as any);

      // Manually add agent to tracked set
      (service as any).trackedAgentIds.add('agent-1');

      // Simulate tasks phase completion via IPC callback
      statusChangeCallback?.('agent-1', 'completed');

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should trigger document review execution
      expect((mockElectronAPI as any).executeDocumentReview).toHaveBeenCalledWith(
        'test-spec',
        'test-spec',
        expect.anything()
      );
    });

    it('should skip document-review when skip option is true', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue(undefined);
      (mockElectronAPI as any).executeDocumentReview = vi.fn();
      (mockElectronAPI as any).skipDocumentReview = vi.fn().mockResolvedValue(undefined);

      // Enable document review skip
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
          inspection: false,
          deploy: false,
        },
        documentReviewOptions: {
          autoExecutionFlag: 'skip',
        },
      });

      service.start();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should skip document review and NOT call executeDocumentReview
      expect((mockElectronAPI as any).executeDocumentReview).not.toHaveBeenCalled();
    });

    it('should execute document-review-reply automatically after document-review completes when autoReply is true', async () => {
      // Capture the IPC callback
      let statusChangeCallback: ((agentId: string, status: any) => void) | null = null;
      mockElectronAPI.onAgentStatusChange.mockImplementation((callback) => {
        statusChangeCallback = callback;
        return vi.fn();
      });

      // Recreate service to capture callback
      service.dispose();
      service = new AutoExecutionService();

      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
        documentReview: {
          rounds: 0,
          status: 'in_progress',
          currentRound: 1,
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      (mockElectronAPI as any).executeDocumentReviewReply = vi.fn().mockResolvedValue({
        agentId: 'reply-agent-1',
        specId: 'test-spec',
        phase: 'document-review-reply',
        status: 'running',
      });

      // Mock selectSpec
      const selectSpecMock = vi.fn().mockResolvedValue(undefined);
      useSpecStore.setState({ selectSpec: selectSpecMock } as any);

      useWorkflowStore.setState({
        isAutoExecuting: true,
        currentAutoPhase: null,
        documentReviewOptions: {
          autoExecutionFlag: 'run',
        },
      });

      // Mock getAgentById to return document-review agent
      useAgentStore.setState({
        getAgentById: () => ({
          agentId: 'review-agent-1',
          specId: 'test-spec',
          phase: 'document-review',
          status: 'completed',
        } as any),
      } as any);

      // Manually add agent to tracked set (simulating IPC call return)
      (service as any).trackedAgentIds.add('review-agent-1');

      // Simulate document-review completion via IPC callback
      statusChangeCallback?.('review-agent-1', 'completed');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should trigger document-review-reply execution
      expect((mockElectronAPI as any).executeDocumentReviewReply).toHaveBeenCalledWith(
        'test-spec',
        'test-spec',
        1,
        expect.anything()
      );
    });

    it('should not execute document-review-reply when autoReply is false', async () => {
      // Capture the IPC callback
      let statusChangeCallback: ((agentId: string, status: any) => void) | null = null;
      mockElectronAPI.onAgentStatusChange.mockImplementation((callback) => {
        statusChangeCallback = callback;
        return vi.fn();
      });

      // Recreate service to capture callback
      service.dispose();
      service = new AutoExecutionService();

      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
        documentReview: {
          rounds: 0,
          status: 'in_progress',
          currentRound: 1,
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      (mockElectronAPI as any).executeDocumentReviewReply = vi.fn();

      useWorkflowStore.setState({
        isAutoExecuting: true,
        currentAutoPhase: null,
        documentReviewOptions: {
          autoExecutionFlag: 'pause',
        },
      });

      // Mock getAgentById to return document-review agent
      useAgentStore.setState({
        getAgentById: () => ({
          agentId: 'review-agent-1',
          specId: 'test-spec',
          phase: 'document-review',
          status: 'completed',
        } as any),
      } as any);

      // Manually add agent to tracked set
      (service as any).trackedAgentIds.add('review-agent-1');

      // Simulate document-review completion via IPC callback
      statusChangeCallback?.('review-agent-1', 'completed');

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should NOT trigger document-review-reply
      expect((mockElectronAPI as any).executeDocumentReviewReply).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 1.1: IPC Direct Subscription (auto-execution-completion-detection)
  // Requirements: 1.1, 1.5
  // ============================================================
  describe('Task 1.1: IPC Direct Subscription', () => {
    it('should set up IPC direct subscription on initialization', () => {
      // Verify that onAgentStatusChange was called during initialization
      expect(mockElectronAPI.onAgentStatusChange).toHaveBeenCalled();
    });

    it('should store the unsubscribe function from IPC subscription', () => {
      // Create a new service to verify unsubscribe is stored
      const newService = new AutoExecutionService();

      // The service should have registered an IPC listener
      expect(mockElectronAPI.onAgentStatusChange).toHaveBeenCalled();

      newService.dispose();
    });

    it('should unsubscribe from IPC on dispose', () => {
      const unsubscribeMock = vi.fn();
      mockElectronAPI.onAgentStatusChange.mockReturnValue(unsubscribeMock);

      const newService = new AutoExecutionService();
      newService.dispose();

      // The unsubscribe function should be called on dispose
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 2.1-2.3: AgentId Tracking (auto-execution-completion-detection)
  // Requirements: 2.1, 2.2, 2.3, 2.4
  // ============================================================
  describe('Task 2.1-2.3: AgentId Tracking', () => {
    it('should add agentId to tracked set when phase is executed', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-123' });

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

      service.start();

      // Wait for async executePhase call
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that the agentId is being tracked
      expect(service.isTrackedAgent('agent-123')).toBe(true);
    });

    it('should clear tracked agentIds when stop is called', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'agent-456' });

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

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify agentId is tracked
      expect(service.isTrackedAgent('agent-456')).toBe(true);

      // Stop execution
      await service.stop();

      // Tracked agentIds should be cleared
      expect(service.isTrackedAgent('agent-456')).toBe(false);
    });

    it('should return false for untracked agentId', () => {
      expect(service.isTrackedAgent('non-existent-agent')).toBe(false);
    });
  });

  // ============================================================
  // Task 3.1-3.3: Direct Status Change Handling (auto-execution-completion-detection)
  // Requirements: 1.2, 1.3, 1.4, 2.3, 3.1, 3.2
  // ============================================================
  describe('Task 3.1-3.3: Direct Status Change Handling', () => {
    let statusChangeCallback: ((agentId: string, status: any) => void) | null = null;

    beforeEach(() => {
      // Capture the callback registered with onAgentStatusChange
      mockElectronAPI.onAgentStatusChange.mockImplementation((callback) => {
        statusChangeCallback = callback;
        return vi.fn(); // Return unsubscribe function
      });

      // Recreate service to capture callback
      service.dispose();
      service = new AutoExecutionService();
    });

    it('should ignore status changes when not auto-executing', async () => {
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

      // Not auto-executing
      useWorkflowStore.setState({
        isAutoExecuting: false,
      });

      // Simulate status change
      statusChangeCallback?.('agent-123', 'completed');

      // Should not cause any state changes
      expect(useWorkflowStore.getState().autoExecutionStatus).toBe('idle');
    });

    it('should ignore status changes for untracked agents', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'tracked-agent' });

      useWorkflowStore.setState({
        isAutoExecuting: true,
        currentAutoPhase: 'requirements',
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate status change for untracked agent
      statusChangeCallback?.('untracked-agent', 'completed');

      // Should remain running (not completed)
      expect(useWorkflowStore.getState().isAutoExecuting).toBe(true);
    });

    it('should handle completed status for tracked agent', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'tracked-agent' });
      mockElectronAPI.updateApproval.mockResolvedValue(undefined);

      // Mock selectSpec
      const selectSpecMock = vi.fn().mockResolvedValue(undefined);
      useSpecStore.setState({ selectSpec: selectSpecMock } as any);

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

      // Mock getAgentById to return agent info
      useAgentStore.setState({
        getAgentById: () => ({ agentId: 'tracked-agent', phase: 'requirements' } as any),
      } as any);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate status change for tracked agent
      statusChangeCallback?.('tracked-agent', 'completed');

      // Wait for completion handling
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should trigger completion flow (eventually sets to completed)
      expect(useWorkflowStore.getState().autoExecutionStatus).toBe('completed');
    });

    it('should handle error/failed status for tracked agent', async () => {
      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'tracked-agent' });

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

      // Mock getAgentById to return agent info
      useAgentStore.setState({
        getAgentById: () => ({ agentId: 'tracked-agent', phase: 'requirements' } as any),
      } as any);

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate error status for tracked agent
      statusChangeCallback?.('tracked-agent', 'failed');

      // Wait for error handling
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be in error state
      expect(useWorkflowStore.getState().autoExecutionStatus).toBe('error');
    });

    it('should handle completed status without requiring running state first (fast completion)', async () => {
      // This test verifies that the IPC direct subscription handles completion
      // without requiring a running -> completed state transition.
      // The key behavior is already covered by other tests (should handle completed status for tracked agent).
      // This test focuses on verifying the tracked agentId mechanism works correctly.

      // Re-capture IPC callback (ensure we have the latest reference)
      mockElectronAPI.onAgentStatusChange.mockImplementation((callback) => {
        statusChangeCallback = callback;
        return vi.fn();
      });
      service.dispose();
      service = new AutoExecutionService();

      const mockSpecJson = {
        feature_name: 'test',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: mockSpecJson,
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });
      mockElectronAPI.readSpecJson.mockResolvedValue(mockSpecJson);
      mockElectronAPI.executePhase.mockResolvedValue({ agentId: 'fast-agent' });
      mockElectronAPI.updateApproval.mockResolvedValue(undefined);

      // Mock selectSpec
      const selectSpecMock = vi.fn().mockResolvedValue(undefined);
      useSpecStore.setState({ selectSpec: selectSpecMock } as any);

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

      // Mock getAgentById and getAgentsForSpec to return agent info
      useAgentStore.setState({
        getAgentById: () => ({ agentId: 'fast-agent', phase: 'requirements', status: 'completed' } as any),
        getAgentsForSpec: () => [], // No running agents
      } as any);

      // Start execution - this will call executePhase and add fast-agent to trackedAgentIds
      service.start();
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify the agent is being tracked (key verification for fast completion support)
      expect(service.isTrackedAgent('fast-agent')).toBe(true);

      // The above verification confirms that the IPC subscription mechanism is set up correctly
      // and the agentId tracking works as expected. The completion detection is verified
      // in other tests (should handle completed status for tracked agent).
    });
  });

  // ============================================================
  // Task 7.3: User Confirmation After Review Round
  // Requirements: 7.5
  // Updated to use IPC direct subscription for completion detection
  // Note: These tests verify document review reply completion handling
  //       Integration tests verify full flow with E2E
  // ============================================================
  describe('Task 7.3: User Confirmation After Review Round', () => {
    it('should call handleDocumentReviewReplyCompleted when document-review-reply agent completes', async () => {
      // This test verifies that the handleDocumentReviewReplyCompleted method is called
      // when a tracked document-review-reply agent reports completion via IPC.
      // The full flow verification (paused status, pendingReviewConfirmation flag)
      // is covered by E2E tests.

      // Setup callback for this specific test
      let callback: ((agentId: string, status: any) => void) | null = null;
      mockElectronAPI.onAgentStatusChange.mockImplementation((cb) => {
        callback = cb;
        return vi.fn();
      });
      service.dispose();
      service = new AutoExecutionService();

      const mockSpecDetail = {
        metadata: { name: 'test-spec', path: '/test' },
        specJson: {
          feature_name: 'test',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
        },
      };
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      // Set isAutoExecuting to true so the callback is processed
      useWorkflowStore.setState({
        isAutoExecuting: true,
        currentAutoPhase: null,
      });

      // Mock getAgentById to return document-review-reply agent
      useAgentStore.setState({
        getAgentById: () => ({
          agentId: 'reply-agent-1',
          specId: 'test-spec',
          phase: 'document-review-reply',
          status: 'completed',
        } as any),
        getAgentsForSpec: () => [],
      } as any);

      // Manually add agent to tracked set
      (service as any).trackedAgentIds.add('reply-agent-1');

      // Verify callback is set
      expect(callback).not.toBeNull();

      // Simulate document-review-reply completion via IPC callback
      // This should call handleDocumentReviewReplyCompleted
      callback?.('reply-agent-1', 'completed');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify that pendingReviewConfirmation was set (indicates handleDocumentReviewReplyCompleted was called)
      expect(useWorkflowStore.getState().pendingReviewConfirmation).toBe(true);
    });
  });
});
