/**
 * useConvertBugToWorktree Hook Tests
 * trpc-full-migration Task 8.2: tRPC vanilla client migration
 * Originally: bugs-workflow-footer Task 5.1
 * Requirements: 7.1-7.7, 8.1-8.4
 *
 * Tests verify that:
 * - worktreeCheckMain is called via getVanillaClient().git.worktreeCheckMain.query
 * - convertBugToWorktree is called via getVanillaClient().bug.convertToWorktree.mutate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConvertBugToWorktree } from './useConvertBugToWorktree';

// Mock tRPC vanilla client
const mockWorktreeCheckMainQuery = vi.fn();
const mockBugConvertToWorktreeMutate = vi.fn();

vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => ({
    git: {
      worktreeCheckMain: { query: mockWorktreeCheckMainQuery },
    },
    bug: {
      convertToWorktree: { mutate: mockBugConvertToWorktreeMutate },
    },
  }),
}));

// Mock stores
vi.mock('../stores', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
  useProjectStore: (selector: (state: { currentProject: string }) => string) =>
    selector({ currentProject: '/test/project/path' }),
}));

// Import after mock to get the mocked version
import { notify } from '../stores';

describe('useConvertBugToWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isOnMain state', () => {
    it('should initialize isOnMain as false', () => {
      // Requirements: 8.3
      const { result } = renderHook(() => useConvertBugToWorktree());
      expect(result.current.isOnMain).toBe(false);
    });

    it('should set isOnMain to true when on main branch', async () => {
      // Requirements: 8.4
      mockWorktreeCheckMainQuery.mockResolvedValue({ ok: true, value: { isMain: true } });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(result.current.isOnMain).toBe(true);
    });

    it('should set isOnMain to false when not on main branch', async () => {
      // Requirements: 8.4
      mockWorktreeCheckMainQuery.mockResolvedValue({ ok: true, value: { isMain: false } });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(result.current.isOnMain).toBe(false);
    });
  });

  describe('isConverting state', () => {
    it('should initialize isConverting as false', () => {
      // Requirements: 7.2
      const { result } = renderHook(() => useConvertBugToWorktree());
      expect(result.current.isConverting).toBe(false);
    });

    it('should set isConverting to true during conversion', async () => {
      // Requirements: 7.2
      mockBugConvertToWorktreeMutate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, value: {} }), 100))
      );

      const { result } = renderHook(() => useConvertBugToWorktree());

      let convertPromise: Promise<boolean>;
      act(() => {
        convertPromise = result.current.handleConvert('test-bug');
      });

      // Check isConverting is true during conversion
      expect(result.current.isConverting).toBe(true);

      // Wait for conversion to complete
      await act(async () => {
        await convertPromise;
      });
    });

    it('should set isConverting to false after conversion', async () => {
      // Requirements: 7.7
      mockBugConvertToWorktreeMutate.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('test-bug');
      });

      expect(result.current.isConverting).toBe(false);
    });

    it('should set isConverting to false even on error', async () => {
      // Requirements: 7.7
      mockBugConvertToWorktreeMutate.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', message: 'Not on main branch' },
      });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('test-bug');
      });

      expect(result.current.isConverting).toBe(false);
    });
  });

  describe('handleConvert', () => {
    it('should call tRPC bug.convertToWorktree.mutate with bugName', async () => {
      // Requirements: 7.4
      mockBugConvertToWorktreeMutate.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('my-bug');
      });

      expect(mockBugConvertToWorktreeMutate).toHaveBeenCalledWith({ bugName: 'my-bug' });
    });

    it('should show success notification on success', async () => {
      // Requirements: 7.5
      mockBugConvertToWorktreeMutate.mockResolvedValue({
        ok: true,
        value: { path: '.kiro/worktrees/bugs/test', branch: 'bugfix/test', created_at: '2024-01-01' },
      });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('test-bug');
      });

      expect(notify.success).toHaveBeenCalled();
    });

    it('should show error notification on failure', async () => {
      // Requirements: 7.6
      mockBugConvertToWorktreeMutate.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', message: 'Not on main branch' },
      });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.handleConvert('test-bug');
      });

      expect(notify.error).toHaveBeenCalled();
    });

    it('should return true on success', async () => {
      mockBugConvertToWorktreeMutate.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertBugToWorktree());

      let success: boolean;
      await act(async () => {
        success = await result.current.handleConvert('test-bug');
      });

      expect(success!).toBe(true);
    });

    it('should return false on failure', async () => {
      mockBugConvertToWorktreeMutate.mockResolvedValue({
        ok: false,
        error: { type: 'BUG_NOT_FOUND', message: 'Bug not found' },
      });

      const { result } = renderHook(() => useConvertBugToWorktree());

      let success: boolean;
      await act(async () => {
        success = await result.current.handleConvert('test-bug');
      });

      expect(success!).toBe(false);
    });
  });

  describe('refreshMainBranchStatus', () => {
    it('should call tRPC git.worktreeCheckMain.query with projectPath', async () => {
      // Requirements: 8.1, 8.2
      mockWorktreeCheckMainQuery.mockResolvedValue({ ok: true, value: { isMain: true } });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(mockWorktreeCheckMainQuery).toHaveBeenCalledWith({
        projectPath: '/test/project/path',
      });
    });

    it('should handle tRPC error gracefully', async () => {
      mockWorktreeCheckMainQuery.mockResolvedValue({ ok: false, error: { type: 'GIT_ERROR' } });

      const { result } = renderHook(() => useConvertBugToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      // Should remain false on error
      expect(result.current.isOnMain).toBe(false);
    });
  });
});
