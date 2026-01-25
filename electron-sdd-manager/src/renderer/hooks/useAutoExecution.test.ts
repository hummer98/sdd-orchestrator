/**
 * useAutoExecution Hook Tests
 * TDD: Testing auto-execution functionality
 * Feature: inspection-permission-unification Task 1.1
 * Requirements: 1.3, 1.5
 *
 * auto-execution-projectpath-fix Task 4.5:
 * Requirements: 4.3 - Renderer側store/hookでprojectPath取得・送信
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AutoExecutionPermissions } from './useAutoExecution';
import { useAutoExecution } from './useAutoExecution';

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
// auto-execution-projectpath-fix Task 4.5: projectPath parameter
// Requirements: 4.3 - Renderer側store/hookでprojectPath取得・送信
// ============================================================

describe('useAutoExecution projectPath handling (Task 4.5)', () => {
  // Mock window.electronAPI
  const mockAutoExecutionStart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.electronAPI.autoExecutionStart
    (global as unknown as { window: { electronAPI: unknown } }).window = {
      electronAPI: {
        autoExecutionStart: mockAutoExecutionStart,
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startAutoExecution', () => {
    it('should accept projectPath as the first parameter', async () => {
      mockAutoExecutionStart.mockResolvedValue({
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
        documentReviewFlag: 'pause' as const,
      };

      await act(async () => {
        await result.current.startAutoExecution(
          testProjectPath,
          testSpecPath,
          testSpecId,
          testOptions
        );
      });

      // Verify that autoExecutionStart was called with projectPath
      expect(mockAutoExecutionStart).toHaveBeenCalledTimes(1);
      expect(mockAutoExecutionStart).toHaveBeenCalledWith({
        projectPath: testProjectPath,
        specPath: testSpecPath,
        specId: testSpecId,
        options: testOptions,
      });
    });

    it('should pass projectPath through to IPC call', async () => {
      mockAutoExecutionStart.mockResolvedValue({
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

      // Simulate worktree scenario where specPath differs from projectPath
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
            documentReviewFlag: 'run' as const,
          }
        );
      });

      // The projectPath should be the main repository, not derived from specPath
      const callArg = mockAutoExecutionStart.mock.calls[0][0];
      expect(callArg.projectPath).toBe(projectPath);
      expect(callArg.specPath).toBe(specPath);
    });
  });
});
