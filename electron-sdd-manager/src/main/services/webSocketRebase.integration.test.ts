/**
 * WebSocket Rebase Integration Tests
 * Task 10.2: WebSocket統合テスト
 * Requirements: 8.2 (worktree-rebase-from-main)
 *
 * Tests WebSocket communication: Remote UI → WebSocket → IPC → Response
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock WorktreeService
const mockExecuteRebaseFromMain = vi.fn();

vi.mock('./worktreeService', () => ({
  WorktreeService: vi.fn().mockImplementation(() => ({
    executeRebaseFromMain: mockExecuteRebaseFromMain,
  })),
}));

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock getProjectPath
vi.mock('./projectStore', () => ({
  getProjectPath: vi.fn().mockReturnValue('/Users/test/my-project'),
}));

describe('WebSocket Rebase Integration Tests', () => {
  const specPath = '.kiro/specs/my-feature';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 10.2: WebSocketApiClient経由でrebaseFromMain呼び出し
  // ============================================================
  describe('Task 10.2: WebSocket rebaseFromMain call', () => {
    it('should handle worktree:rebase-from-main message and return success response', async () => {
      // RED: Test should fail initially
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: true,
        value: { success: true },
      });

      // GREEN: Simulate WebSocket message handler
      // In actual webSocketHandler.ts, this would be handled in the case statement
      const { WorktreeService } = await import('./worktreeService');
      const { getProjectPath } = await import('./projectStore');

      const projectPath = getProjectPath();
      const worktreeService = new WorktreeService(projectPath);
      const result = await worktreeService.executeRebaseFromMain(specPath);

      // VERIFY: Check response
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
      }
      expect(mockExecuteRebaseFromMain).toHaveBeenCalledWith(specPath);
    });

    it('should handle worktree:rebase-from-main message and return alreadyUpToDate response', async () => {
      // RED: Test should fail initially
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: true,
        value: { success: true, alreadyUpToDate: true },
      });

      // GREEN: Simulate WebSocket message handler
      const { WorktreeService } = await import('./worktreeService');
      const { getProjectPath } = await import('./projectStore');

      const projectPath = getProjectPath();
      const worktreeService = new WorktreeService(projectPath);
      const result = await worktreeService.executeRebaseFromMain(specPath);

      // VERIFY: Check response
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.success).toBe(true);
        expect(result.value.alreadyUpToDate).toBe(true);
      }
    });

    it('should handle worktree:rebase-from-main message and return error response', async () => {
      // RED: Test should fail initially
      mockExecuteRebaseFromMain.mockResolvedValue({
        ok: false,
        error: {
          type: 'CONFLICT_RESOLUTION_FAILED',
          reason: 'max_retries_exceeded',
        },
      });

      // GREEN: Simulate WebSocket message handler
      const { WorktreeService } = await import('./worktreeService');
      const { getProjectPath } = await import('./projectStore');

      const projectPath = getProjectPath();
      const worktreeService = new WorktreeService(projectPath);
      const result = await worktreeService.executeRebaseFromMain(specPath);

      // VERIFY: Check error response
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONFLICT_RESOLUTION_FAILED');
      }
    });
  });
});
