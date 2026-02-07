/**
 * ElectronSpecWorkflowApi Tests
 *
 * TDD tests for ElectronSpecWorkflowApi.
 * Task 4.3: startAutoExecution()にprojectPath引数を追加
 * trpc-full-migration Task 7.2: Replace window.electronAPI with tRPC vanilla client
 * Requirements: 6.2 - AutoExecution全チャンネル移行
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// trpc-full-migration Task 5.3 + Task 7.2: Mock tRPC vanilla client for spec and autoExecution operations
const mockVanillaClient = {
  spec: {
    execute: { mutate: vi.fn() },
    updateApproval: { mutate: vi.fn() },
    updateSpecJson: { mutate: vi.fn() },
    getEventLog: { query: vi.fn() },
    startImpl: { mutate: vi.fn() },
    parseTasksForParallel: { query: vi.fn() },
  },
  file: {
    readSpecJson: { query: vi.fn() },
    readArtifact: { query: vi.fn() },
  },
  autoExecution: {
    start: { mutate: vi.fn() },
    stop: { mutate: vi.fn() },
    getStatus: { query: vi.fn() },
  },
};
vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

import { ElectronSpecWorkflowApi } from './ElectronSpecWorkflowApi';

describe('ElectronSpecWorkflowApi', () => {
  let api: ElectronSpecWorkflowApi;

  beforeEach(() => {
    api = new ElectronSpecWorkflowApi();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // trpc-full-migration Task 7.2: Tests for tRPC-based autoExecution
  describe('startAutoExecution (tRPC Task 7.2)', () => {
    const testProjectPath = '/path/to/project';
    const testSpecPath = '/path/to/project/.kiro/specs/test-feature';
    const testSpecId = 'test-feature';
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

    it('should call tRPC autoExecution.start.mutate with correct parameters', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockResolvedValue({
        ok: true,
        value: {
          status: 'running',
          currentPhase: 'requirements',
          executedPhases: [],
        },
      });

      await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      expect(mockVanillaClient.autoExecution.start.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: testProjectPath,
          specPath: testSpecPath,
          specId: testSpecId,
        })
      );
    });

    it('should return success result with mapped state', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockResolvedValue({
        ok: true,
        value: {
          status: 'running',
          currentPhase: 'requirements',
          executedPhases: ['requirements'],
        },
      });

      const result = await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('running');
        expect(result.value.currentPhase).toBe('requirements');
        expect(result.value.completedPhases).toEqual(['requirements']);
      }
    });

    it('should return error result when autoExecution.start fails', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockResolvedValue({
        ok: false,
        error: {
          type: 'ALREADY_RUNNING',
          message: 'Auto execution is already running',
        },
      });

      const result = await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_RUNNING');
      }
    });

    it('should handle exceptions and return error result', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockRejectedValue(new Error('tRPC error'));

      const result = await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AUTO_EXECUTION_ERROR');
        expect(result.error.message).toBe('tRPC error');
      }
    });

    it('should pass permissions correctly to tRPC call', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockResolvedValue({
        ok: true,
        value: {
          status: 'running',
          currentPhase: null,
          executedPhases: [],
        },
      });

      await api.startAutoExecution(testProjectPath, testSpecPath, testSpecId, testOptions);

      expect(mockVanillaClient.autoExecution.start.mutate).toHaveBeenCalledWith(
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

  describe('stopAutoExecution (tRPC Task 7.2)', () => {
    it('should call tRPC autoExecution.stop.mutate', async () => {
      mockVanillaClient.autoExecution.stop.mutate.mockResolvedValue({ ok: true, value: undefined });

      const result = await api.stopAutoExecution('/test/.kiro/specs/test-feature');

      expect(mockVanillaClient.autoExecution.stop.mutate).toHaveBeenCalledWith({
        specPath: '/test/.kiro/specs/test-feature',
      });
      expect(result.ok).toBe(true);
    });
  });
});
