/**
 * useAutoExecution Hook Tests
 * TDD: Testing auto-execution functionality
 * Feature: inspection-permission-unification Task 1.1
 * Requirements: 1.3, 1.5
 *
 * auto-execution-projectpath-fix Task 4.5:
 * Requirements: 4.3 - Renderer側store/hookでprojectPath取得・送信
 *
 * trpc-full-migration Task 7.2: Replace window.electronAPI with tRPC vanilla client
 * Requirements: 6.2 - AutoExecution全チャンネル移行
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AutoExecutionPermissions } from './useAutoExecution';
import { useAutoExecution } from './useAutoExecution';

// trpc-full-migration Task 7.2: Mock tRPC vanilla client for autoExecution operations
const mockVanillaClient = {
  autoExecution: {
    start: { mutate: vi.fn() },
    stop: { mutate: vi.fn() },
    getStatus: { query: vi.fn() },
    retryFrom: { mutate: vi.fn() },
  },
};
vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

describe('useAutoExecution Types', () => {
  // ============================================================
  // inspection-permission-unification Task 1.1: Type Definition
  // Requirements: 1.3, 1.5
  // ============================================================
  describe('Task 1.1: AutoExecutionPermissions type', () => {
    it('should have inspection field as required boolean', () => {
      const permissions: AutoExecutionPermissions = {
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: true,
        deploy: false,
      };

      expect(permissions.inspection).toBe(true);
    });

    it('should have deploy field as required boolean', () => {
      const permissions: AutoExecutionPermissions = {
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: true,
        deploy: true,
      };

      expect(permissions.deploy).toBe(true);
    });

    it('should require all 6 phase fields', () => {
      const permissions: AutoExecutionPermissions = {
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: true,
        deploy: true,
      };

      // All fields should be defined
      expect(permissions.requirements).toBeDefined();
      expect(permissions.design).toBeDefined();
      expect(permissions.tasks).toBeDefined();
      expect(permissions.impl).toBeDefined();
      expect(permissions.inspection).toBeDefined();
      expect(permissions.deploy).toBeDefined();
    });

    it('should allow false values for all permissions', () => {
      const permissions: AutoExecutionPermissions = {
        requirements: false,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      };

      // All fields should be false
      expect(permissions.requirements).toBe(false);
      expect(permissions.design).toBe(false);
      expect(permissions.tasks).toBe(false);
      expect(permissions.impl).toBe(false);
      expect(permissions.inspection).toBe(false);
      expect(permissions.deploy).toBe(false);
    });

    // This test verifies that TypeScript would not allow an object without all 6 fields
    // (the type system enforces this at compile time, this is a runtime verification)
    it('should have exactly 6 keys in the permissions object', () => {
      const permissions: AutoExecutionPermissions = {
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: true,
        deploy: false,
      };

      const keys = Object.keys(permissions);
      expect(keys).toHaveLength(6);
      expect(keys).toContain('requirements');
      expect(keys).toContain('design');
      expect(keys).toContain('tasks');
      expect(keys).toContain('impl');
      expect(keys).toContain('inspection');
      expect(keys).toContain('deploy');
    });
  });
});

// ============================================================
// trpc-full-migration Task 7.2: tRPC vanilla client integration
// Requirements: 6.2 - AutoExecution全チャンネル移行
// ============================================================

describe('useAutoExecution tRPC integration (Task 7.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startAutoExecution', () => {
    it('should call tRPC autoExecution.start.mutate with correct parameters', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockResolvedValue({
        ok: true,
        value: {
          specPath: '/test/project/.kiro/specs/test-spec',
          specId: 'test-spec',
          status: 'running',
          currentPhase: null,
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const { result } = renderHook(() => useAutoExecution());

      const testProjectPath = '/test/project';
      const testSpecPath = '/test/project/.kiro/specs/test-spec';
      const testSpecId = 'test-spec';
      const testOptions = {
        permissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
          inspection: false,
          deploy: false,
        },
      };

      await act(async () => {
        await result.current.startAutoExecution(
          testProjectPath,
          testSpecPath,
          testSpecId,
          testOptions
        );
      });

      // Verify tRPC client was called (not window.electronAPI)
      expect(mockVanillaClient.autoExecution.start.mutate).toHaveBeenCalledTimes(1);
      expect(mockVanillaClient.autoExecution.start.mutate).toHaveBeenCalledWith({
        projectPath: testProjectPath,
        specPath: testSpecPath,
        specId: testSpecId,
        options: testOptions,
      });
    });

    it('should pass projectPath through to tRPC call', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockResolvedValue({
        ok: true,
        value: {
          specPath: '/worktree/path/.kiro/specs/feature',
          specId: 'feature',
          status: 'running',
          currentPhase: 'requirements',
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const { result } = renderHook(() => useAutoExecution());

      const projectPath = '/main/repository';
      const specPath = '/main/repository/.kiro/worktrees/specs/feature/.kiro/specs/feature';

      await act(async () => {
        await result.current.startAutoExecution(
          projectPath,
          specPath,
          'feature',
          {
            permissions: {
              requirements: true,
              design: false,
              tasks: false,
              impl: false,
              inspection: false,
              deploy: false,
            },
          }
        );
      });

      const callArg = mockVanillaClient.autoExecution.start.mutate.mock.calls[0][0];
      expect(callArg.projectPath).toBe(projectPath);
      expect(callArg.specPath).toBe(specPath);
    });

    it('should handle error result from tRPC', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockResolvedValue({
        ok: false,
        error: {
          type: 'ALREADY_EXECUTING',
          specId: 'test-spec',
        },
      });

      const { result } = renderHook(() => useAutoExecution());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.startAutoExecution(
          '/test',
          '/test/.kiro/specs/test-spec',
          'test-spec',
          { permissions: { requirements: true, design: false, tasks: false, impl: false, inspection: false, deploy: false } }
        );
      });

      expect((returnValue as any).ok).toBe(false);
    });

    it('should handle tRPC exceptions gracefully', async () => {
      mockVanillaClient.autoExecution.start.mutate.mockRejectedValue(new Error('tRPC error'));

      const { result } = renderHook(() => useAutoExecution());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.startAutoExecution(
          '/test',
          '/test/.kiro/specs/test',
          'test',
          { permissions: { requirements: true, design: false, tasks: false, impl: false, inspection: false, deploy: false } }
        );
      });

      expect((returnValue as any).ok).toBe(false);
      expect((returnValue as any).error.type).toBe('PHASE_EXECUTION_FAILED');
    });
  });

  describe('stopAutoExecution', () => {
    it('should call tRPC autoExecution.stop.mutate', async () => {
      mockVanillaClient.autoExecution.stop.mutate.mockResolvedValue({ ok: true, value: undefined });
      mockVanillaClient.autoExecution.getStatus.query.mockResolvedValue(null);

      const { result } = renderHook(() => useAutoExecution());

      await act(async () => {
        await result.current.stopAutoExecution('/test/.kiro/specs/test-spec');
      });

      expect(mockVanillaClient.autoExecution.stop.mutate).toHaveBeenCalledWith({
        specPath: '/test/.kiro/specs/test-spec',
      });
    });

    it('should refresh status via tRPC after stop', async () => {
      mockVanillaClient.autoExecution.stop.mutate.mockResolvedValue({ ok: true, value: undefined });
      mockVanillaClient.autoExecution.getStatus.query.mockResolvedValue({
        specPath: '/test/.kiro/specs/test-spec',
        status: 'idle',
        currentPhase: null,
        executedPhases: [],
        errors: [],
      });

      const { result } = renderHook(() => useAutoExecution());

      await act(async () => {
        await result.current.stopAutoExecution('/test/.kiro/specs/test-spec');
      });

      expect(mockVanillaClient.autoExecution.getStatus.query).toHaveBeenCalledWith({
        specPath: '/test/.kiro/specs/test-spec',
      });
    });
  });

  describe('retryFromPhase', () => {
    it('should call tRPC autoExecution.retryFrom.mutate', async () => {
      mockVanillaClient.autoExecution.retryFrom.mutate.mockResolvedValue({
        ok: true,
        value: {
          specPath: '/test/.kiro/specs/test-spec',
          specId: 'test-spec',
          status: 'running',
          currentPhase: 'design',
          executedPhases: [],
          errors: [],
          startTime: Date.now(),
          lastActivityTime: Date.now(),
        },
      });

      const { result } = renderHook(() => useAutoExecution());

      await act(async () => {
        await result.current.retryFromPhase('/test/.kiro/specs/test-spec', 'design');
      });

      expect(mockVanillaClient.autoExecution.retryFrom.mutate).toHaveBeenCalledWith({
        specPath: '/test/.kiro/specs/test-spec',
        phase: 'design',
      });
    });
  });

  describe('refreshStatus', () => {
    it('should call tRPC autoExecution.getStatus.query', async () => {
      mockVanillaClient.autoExecution.getStatus.query.mockResolvedValue({
        specPath: '/test/.kiro/specs/test-spec',
        status: 'running',
        currentPhase: 'tasks',
        executedPhases: ['requirements', 'design'],
        errors: [],
      });

      const { result } = renderHook(() => useAutoExecution());

      await act(async () => {
        await result.current.refreshStatus('/test/.kiro/specs/test-spec');
      });

      expect(mockVanillaClient.autoExecution.getStatus.query).toHaveBeenCalledWith({
        specPath: '/test/.kiro/specs/test-spec',
      });
    });
  });
});
