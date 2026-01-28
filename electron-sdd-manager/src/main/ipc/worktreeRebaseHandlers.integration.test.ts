/**
 * Worktree Rebase IPC Integration Tests
 * Task 10.1: IPC統合テスト
 * Requirements: 5.1, 5.2, 5.3, 5.4 (worktree-rebase-from-main)
 *
 * Tests the integration flow: Renderer → IPC → worktreeService → Script → Response
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWorktreeRebaseFromMain } from './worktreeHandlers';

// Mock WorktreeService
const mockExecuteRebaseFromMain = vi.fn();

vi.mock('../services/worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => ({
    executeRebaseFromMain: mockExecuteRebaseFromMain,
  })),
}));

// Mock logger
vi.mock('../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Worktree Rebase IPC Integration Tests', () => {
  const projectPath = '/Users/test/my-project';
  const specPath = '.kiro/specs/my-feature';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 10.1a: 成功シナリオ - exit 0 → { success: true }
  // ============================================================
  describe('Task 10.1a: Success Scenario - exit 0', () => {
    it('should return success response when rebase completes successfully', async () => {
      // RED: Test should fail initially
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: true,
        value: { success: true },
      });

      // GREEN: Call handler
      const result = await handleWorktreeRebaseFromMain(projectPath, specPath);

      // VERIFY: Check response
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.alreadyUpToDate).toBeUndefined();
      }
      expect(mockExecuteRebaseFromMain).toHaveBeenCalledWith(specPath);
    });
  });

  // ============================================================
  // Task 10.1b: Already up to dateシナリオ
  // ============================================================
  describe('Task 10.1b: Already up to date scenario', () => {
    it('should return alreadyUpToDate flag when stdout contains "Already up to date"', async () => {
      // RED: Test should fail initially
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: true,
        value: { success: true, alreadyUpToDate: true },
      });

      // GREEN: Call handler
      const result = await handleWorktreeRebaseFromMain(projectPath, specPath);

      // VERIFY: Check response
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.alreadyUpToDate).toBe(true);
      }
    });
  });

  // ============================================================
  // Task 10.1c: コンフリクトシナリオ - AI解決成功（1回目で解決）
  // ============================================================
  describe('Task 10.1c: Conflict scenario - AI resolution success (1st try)', () => {
    it('should resolve conflict with AI and return success', async () => {
      // RED: Test should fail initially
      // AI解決成功 → 最終的に success: true を返す
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: true,
        value: { success: true },
      });

      // GREEN: Call handler
      const result = await handleWorktreeRebaseFromMain(projectPath, specPath);

      // VERIFY: Check response
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
      }
    });
  });

  // ============================================================
  // Task 10.1d: コンフリクトシナリオ - AI解決失敗（7回リトライ後abort）
  // ============================================================
  describe('Task 10.1d: Conflict scenario - AI resolution failure (7 retries)', () => {
    it('should return conflict error when AI fails to resolve after 7 retries', async () => {
      // RED: Test should fail initially
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: false,
        error: {
          type: 'CONFLICT_RESOLUTION_FAILED',
          reason: 'max_retries_exceeded',
        },
      });

      // GREEN: Call handler
      const result = await handleWorktreeRebaseFromMain(projectPath, specPath);

      // VERIFY: Check error response
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFLICT_RESOLUTION_FAILED');
        expect(result.error.reason).toBe('max_retries_exceeded');
      }
    });
  });

  // ============================================================
  // Task 10.1e: エラーシナリオ - スクリプト不在エラー
  // ============================================================
  describe('Task 10.1e: Error scenario - Script not found', () => {
    it('should return script not found error', async () => {
      // RED: Test should fail initially
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: false,
        error: {
          type: 'SCRIPT_NOT_FOUND',
          message: 'rebase-worktree.sh not found',
        },
      });

      // GREEN: Call handler
      const result = await handleWorktreeRebaseFromMain(projectPath, specPath);

      // VERIFY: Check error response
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SCRIPT_NOT_FOUND');
        expect(result.error.message).toContain('rebase-worktree.sh');
      }
    });
  });

  // ============================================================
  // Task 10.1f: エラーシナリオ - jq不在エラー
  // ============================================================
  describe('Task 10.1f: Error scenario - jq not installed', () => {
    it('should return jq not installed error', async () => {
      // RED: Test should fail initially
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: false,
        error: {
          type: 'GIT_ERROR',
          message: 'jq command not found',
        },
      });

      // GREEN: Call handler
      const result = await handleWorktreeRebaseFromMain(projectPath, specPath);

      // VERIFY: Check error response
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('GIT_ERROR');
        expect(result.error.message).toContain('jq');
      }
    });
  });
});
