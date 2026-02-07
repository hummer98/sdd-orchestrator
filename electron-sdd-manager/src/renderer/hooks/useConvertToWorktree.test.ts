/**
 * useConvertToWorktree Hook Tests
 * trpc-full-migration Task 8.2: tRPC vanilla client migration
 * Requirements: 7.2 (Git/Worktree Renderer calls to tRPC hooks)
 *
 * Tests verify that:
 * - worktreeCheckMain is called via getVanillaClient().git.worktreeCheckMain.query
 * - convertCheck is called via getVanillaClient().git.convertCheck.query
 * - convertToWorktree is called via getVanillaClient().git.convertToWorktree.mutate
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock tRPC vanilla client
const mockWorktreeCheckMainQuery = vi.fn();
const mockConvertCheckQuery = vi.fn();
const mockConvertToWorktreeMutate = vi.fn();

vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => ({
    git: {
      worktreeCheckMain: { query: mockWorktreeCheckMainQuery },
      convertCheck: { query: mockConvertCheckQuery },
      convertToWorktree: { mutate: mockConvertToWorktreeMutate },
    },
  }),
}));

// Mock stores - must mock at correct module path
vi.mock('../stores', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../stores/projectStore', () => ({
  useProjectStore: (selector: (state: { currentProject: string }) => unknown) =>
    selector({ currentProject: '/test/project/path' }),
}));

const mockSelectSpec = vi.fn();
vi.mock('../stores/specStore', () => ({
  useSpecStore: (selector: (state: { specDetail: { metadata: { name: string } } }) => unknown) =>
    selector({
      specDetail: {
        metadata: { name: 'test-spec' },
      },
    }),
}));

vi.mock('../stores/spec/specDetailStore', () => ({
  useSpecDetailStore: (selector: (state: { selectSpec: typeof mockSelectSpec; selectedSpec: string }) => unknown) =>
    selector({ selectSpec: mockSelectSpec, selectedSpec: 'test-spec' }),
}));

// Import after mock to get the mocked version
import { notify } from '../stores';
import { useConvertToWorktree } from './useConvertToWorktree';

describe('useConvertToWorktree (tRPC migration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('refreshMainBranchStatus', () => {
    it('should call tRPC git.worktreeCheckMain.query with projectPath', async () => {
      mockWorktreeCheckMainQuery.mockResolvedValue({ ok: true, value: { isMain: true } });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(mockWorktreeCheckMainQuery).toHaveBeenCalledWith({
        projectPath: '/test/project/path',
      });
    });

    it('should set isOnMain to true when on main branch', async () => {
      mockWorktreeCheckMainQuery.mockResolvedValue({ ok: true, value: { isMain: true } });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(result.current.isOnMain).toBe(true);
    });

    it('should set isOnMain to false when not on main branch', async () => {
      mockWorktreeCheckMainQuery.mockResolvedValue({ ok: true, value: { isMain: false } });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(result.current.isOnMain).toBe(false);
    });

    it('should handle error gracefully and set isOnMain to false', async () => {
      mockWorktreeCheckMainQuery.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.refreshMainBranchStatus();
      });

      expect(result.current.isOnMain).toBe(false);
    });
  });

  describe('handleConvert', () => {
    it('should call tRPC git.convertCheck.query for pre-check', async () => {
      mockConvertCheckQuery.mockResolvedValue({ ok: true, value: {} });
      mockConvertToWorktreeMutate.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.handleConvert();
      });

      expect(mockConvertCheckQuery).toHaveBeenCalledWith({
        projectPath: '/test/project/path',
        specPath: 'test-spec',
      });
    });

    it('should call tRPC git.convertToWorktree.mutate after successful check', async () => {
      mockConvertCheckQuery.mockResolvedValue({ ok: true, value: {} });
      mockConvertToWorktreeMutate.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.handleConvert();
      });

      expect(mockConvertToWorktreeMutate).toHaveBeenCalledWith({
        projectPath: '/test/project/path',
        specPath: 'test-spec',
        featureName: 'test-spec',
      });
    });

    it('should show success notification on successful conversion', async () => {
      mockConvertCheckQuery.mockResolvedValue({ ok: true, value: {} });
      mockConvertToWorktreeMutate.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.handleConvert();
      });

      expect(notify.success).toHaveBeenCalledWith('Worktreeモードに変換しました');
    });

    it('should show error notification when convertCheck fails', async () => {
      mockConvertCheckQuery.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_ON_MAIN_BRANCH', currentBranch: 'feature/test' },
      });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.handleConvert();
      });

      expect(notify.error).toHaveBeenCalled();
      // Should NOT call convertToWorktree
      expect(mockConvertToWorktreeMutate).not.toHaveBeenCalled();
    });

    it('should show error notification when convertToWorktree fails', async () => {
      mockConvertCheckQuery.mockResolvedValue({ ok: true, value: {} });
      mockConvertToWorktreeMutate.mockResolvedValue({
        ok: false,
        error: { type: 'WORKTREE_CREATE_FAILED', message: 'Branch already exists' },
      });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.handleConvert();
      });

      expect(notify.error).toHaveBeenCalled();
    });

    it('should set isConverting during conversion', async () => {
      mockConvertCheckQuery.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, value: {} }), 100))
      );
      mockConvertToWorktreeMutate.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertToWorktree());

      let convertPromise: Promise<void>;
      act(() => {
        convertPromise = result.current.handleConvert();
      });

      expect(result.current.isConverting).toBe(true);

      await act(async () => {
        await convertPromise;
      });

      expect(result.current.isConverting).toBe(false);
    });

    it('should reload spec detail after successful conversion', async () => {
      mockConvertCheckQuery.mockResolvedValue({ ok: true, value: {} });
      mockConvertToWorktreeMutate.mockResolvedValue({ ok: true, value: {} });

      const { result } = renderHook(() => useConvertToWorktree());

      await act(async () => {
        await result.current.handleConvert();
      });

      expect(mockSelectSpec).toHaveBeenCalledWith('test-spec', { silent: true });
    });
  });

  describe('initial state', () => {
    it('should initialize isOnMain as false', () => {
      const { result } = renderHook(() => useConvertToWorktree());
      expect(result.current.isOnMain).toBe(false);
    });

    it('should initialize isConverting as false', () => {
      const { result } = renderHook(() => useConvertToWorktree());
      expect(result.current.isConverting).toBe(false);
    });
  });
});
