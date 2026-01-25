/**
 * ElectronSpecWorkflowApi Tests
 *
 * TDD tests for ElectronSpecWorkflowApi.
 * Task 4.3: startAutoExecution()にprojectPath引数を追加
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElectronSpecWorkflowApi } from './ElectronSpecWorkflowApi';

// Mock window.electronAPI
const mockAutoExecutionStart = vi.fn();

const mockElectronAPI = {
  autoExecutionStart: mockAutoExecutionStart,
  // Add other required methods as stubs
  execute: vi.fn(),
  updateApproval: vi.fn(),
  readSpecJson: vi.fn(),
  readArtifact: vi.fn(),
  autoExecutionStop: vi.fn(),
  updateSpecJson: vi.fn(),
  getEventLog: vi.fn(),
  startImpl: vi.fn(),
  parseTasksForParallel: vi.fn(),
};

describe('ElectronSpecWorkflowApi', () => {
  let api: ElectronSpecWorkflowApi;
  let originalElectronAPI: typeof window.electronAPI;

  beforeEach(() => {
    // Store original
    originalElectronAPI = window.electronAPI;
    // Set mock
    (window as unknown as { electronAPI: typeof mockElectronAPI }).electronAPI = mockElectronAPI;
    api = new ElectronSpecWorkflowApi();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original
    (window as unknown as { electronAPI: typeof originalElectronAPI }).electronAPI = originalElectronAPI;
  });

  describe('startAutoExecution', () => {
    const testProjectPath = '/path/to/project';
    const testSpecPath = '/path/to/project/.kiro/specs/test-feature';
    const testSpecId = 'test-feature';
    // document-review-phase: documentReviewFlag removed - use permissions['document-review'] instead
    const testOptions = {
      permissions: {
        requirements: true,
        design: true,
        tasks: true,
        'document-review': true,
        impl: false,
        inspection: true,
        deploy: false,
      },
    };

    it('should accept projectPath as first argument', async () => {
      // Arrange
      mockAutoExecutionStart.mockResolvedValue({
        ok: true,
        value: {
          status: 'running',
          currentPhase: 'requirements',
          executedPhases: [],
        },
      });

      // Act - Call with projectPath as first argument
      await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      // Assert - Verify method accepts 4 arguments
      expect(mockAutoExecutionStart).toHaveBeenCalled();
    });

    it('should pass projectPath to window.electronAPI.autoExecutionStart()', async () => {
      // Arrange
      mockAutoExecutionStart.mockResolvedValue({
        ok: true,
        value: {
          status: 'running',
          currentPhase: 'requirements',
          executedPhases: [],
        },
      });

      // Act
      await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      // Assert - Verify projectPath is passed to IPC call
      expect(mockAutoExecutionStart).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: testProjectPath,
          specPath: testSpecPath,
          specId: testSpecId,
        })
      );
    });

    it('should return success result with mapped state', async () => {
      // Arrange
      mockAutoExecutionStart.mockResolvedValue({
        ok: true,
        value: {
          status: 'running',
          currentPhase: 'requirements',
          executedPhases: ['requirements'],
        },
      });

      // Act
      const result = await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
        expect(result.value.currentPhase).toBe('requirements');
        expect(result.value.completedPhases).toEqual(['requirements']);
      }
    });

    it('should return error result when autoExecutionStart fails', async () => {
      // Arrange
      mockAutoExecutionStart.mockResolvedValue({
        ok: false,
        error: {
          type: 'ALREADY_RUNNING',
          message: 'Auto execution is already running',
        },
      });

      // Act
      const result = await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_RUNNING');
      }
    });

    it('should handle exceptions and return error result', async () => {
      // Arrange
      mockAutoExecutionStart.mockRejectedValue(new Error('IPC error'));

      // Act
      const result = await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AUTO_EXECUTION_ERROR');
        expect(result.error.message).toBe('IPC error');
      }
    });

    it('should pass options correctly to IPC call', async () => {
      // Arrange
      mockAutoExecutionStart.mockResolvedValue({
        ok: true,
        value: {
          status: 'running',
          currentPhase: null,
          executedPhases: [],
        },
      });

      // Act
      await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      // Assert - Verify options structure
      // document-review-phase: documentReviewFlag removed - use permissions['document-review'] instead
      expect(mockAutoExecutionStart).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            permissions: expect.objectContaining({
              requirements: true,
              design: true,
              tasks: true,
              'document-review': true,
              impl: false,
            }),
          }),
        })
      );
    });
  });
});
