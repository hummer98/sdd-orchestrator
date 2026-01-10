/**
 * Shared specStore Tests
 *
 * TDD Test: Task 5.1 - 共有specStoreを実装する
 *
 * このテストはApiClient経由でデータを取得する共有specStoreをテストします。
 * IPC依存を除去し、Electron版とRemote UI版で同一storeを使用可能にします。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSharedSpecStore, resetSharedSpecStore, getSharedSpecStore } from './specStore';
import type { ApiClient, SpecMetadata } from '../api/types';

// Mock ApiClient
const createMockApiClient = (): ApiClient => ({
  getSpecs: vi.fn(),
  getSpecDetail: vi.fn(),
  executePhase: vi.fn(),
  updateApproval: vi.fn(),
  getBugs: vi.fn(),
  getBugDetail: vi.fn(),
  executeBugPhase: vi.fn(),
  getAgents: vi.fn(),
  stopAgent: vi.fn(),
  resumeAgent: vi.fn(),
  sendAgentInput: vi.fn(),
  getAgentLogs: vi.fn(),
  executeValidation: vi.fn(),
  executeDocumentReview: vi.fn(),
  executeInspection: vi.fn(),
  startAutoExecution: vi.fn(),
  stopAutoExecution: vi.fn(),
  getAutoExecutionStatus: vi.fn(),
  saveFile: vi.fn(),
  onSpecsUpdated: vi.fn(() => () => {}),
  onBugsUpdated: vi.fn(() => () => {}),
  onAgentOutput: vi.fn(() => () => {}),
  onAgentStatusChange: vi.fn(() => () => {}),
  onAutoExecutionStatusChanged: vi.fn(() => () => {}),
});

describe('useSharedSpecStore', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    resetSharedSpecStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('specs配列が空で初期化される', () => {
      const { result } = renderHook(() => useSharedSpecStore());

      expect(result.current.specs).toEqual([]);
    });

    it('selectedSpecIdがnullで初期化される', () => {
      const { result } = renderHook(() => useSharedSpecStore());

      expect(result.current.selectedSpecId).toBeNull();
    });

    it('isLoadingがfalseで初期化される', () => {
      const { result } = renderHook(() => useSharedSpecStore());

      expect(result.current.isLoading).toBe(false);
    });

    it('errorがnullで初期化される', () => {
      const { result } = renderHook(() => useSharedSpecStore());

      expect(result.current.error).toBeNull();
    });
  });

  describe('loadSpecs', () => {
    it('ApiClient経由でspecsを読み込む', async () => {
      const mockSpecs: SpecMetadata[] = [
        {
          name: 'feature-a',
          path: '/path/to/feature-a',
          phases: {
            requirements: { status: 'completed', approved: true },
            design: { status: 'pending', approved: false },
            tasks: { status: 'pending', approved: false },
            impl: { status: 'pending', approved: false },
          },
        },
      ];

      vi.mocked(mockApiClient.getSpecs).mockResolvedValue({
        ok: true,
        value: mockSpecs,
      });

      const { result } = renderHook(() => useSharedSpecStore());

      await act(async () => {
        await result.current.loadSpecs(mockApiClient);
      });

      expect(mockApiClient.getSpecs).toHaveBeenCalled();
      expect(result.current.specs).toEqual(mockSpecs);
      expect(result.current.isLoading).toBe(false);
    });

    it('読み込み中はisLoadingがtrueになる', async () => {
      let resolveGetSpecs: (value: { ok: true; value: SpecMetadata[] }) => void;
      vi.mocked(mockApiClient.getSpecs).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGetSpecs = resolve;
          })
      );

      const { result } = renderHook(() => useSharedSpecStore());

      // 非同期操作を開始
      act(() => {
        result.current.loadSpecs(mockApiClient);
      });

      // 読み込み中の状態を確認
      expect(result.current.isLoading).toBe(true);

      // Promise解決
      await act(async () => {
        resolveGetSpecs({ ok: true, value: [] });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('エラー時にerrorが設定される', async () => {
      vi.mocked(mockApiClient.getSpecs).mockResolvedValue({
        ok: false,
        error: { type: 'NetworkError', message: 'Connection failed' },
      });

      const { result } = renderHook(() => useSharedSpecStore());

      await act(async () => {
        await result.current.loadSpecs(mockApiClient);
      });

      expect(result.current.error).toBe('Connection failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('selectSpec', () => {
    it('specIdを選択する', () => {
      const { result } = renderHook(() => useSharedSpecStore());

      act(() => {
        result.current.selectSpec('feature-a');
      });

      expect(result.current.selectedSpecId).toBe('feature-a');
    });

    it('nullで選択解除する', () => {
      const { result } = renderHook(() => useSharedSpecStore());

      act(() => {
        result.current.selectSpec('feature-a');
      });
      act(() => {
        result.current.selectSpec(null);
      });

      expect(result.current.selectedSpecId).toBeNull();
    });
  });

  describe('getSpecById', () => {
    it('存在するspecを返す', async () => {
      const mockSpecs: SpecMetadata[] = [
        {
          name: 'feature-a',
          path: '/path/to/feature-a',
          phases: {
            requirements: { status: 'completed', approved: true },
            design: { status: 'pending', approved: false },
            tasks: { status: 'pending', approved: false },
            impl: { status: 'pending', approved: false },
          },
        },
      ];

      vi.mocked(mockApiClient.getSpecs).mockResolvedValue({
        ok: true,
        value: mockSpecs,
      });

      const { result } = renderHook(() => useSharedSpecStore());

      await act(async () => {
        await result.current.loadSpecs(mockApiClient);
      });

      const spec = result.current.getSpecById('feature-a');
      expect(spec).toEqual(mockSpecs[0]);
    });

    it('存在しないspecはundefinedを返す', () => {
      const { result } = renderHook(() => useSharedSpecStore());

      const spec = result.current.getSpecById('non-existent');
      expect(spec).toBeUndefined();
    });
  });

  describe('updateSpecs', () => {
    it('specs配列を更新する', () => {
      const newSpecs: SpecMetadata[] = [
        {
          name: 'feature-b',
          path: '/path/to/feature-b',
          phases: {
            requirements: { status: 'completed', approved: true },
            design: { status: 'completed', approved: true },
            tasks: { status: 'pending', approved: false },
            impl: { status: 'pending', approved: false },
          },
        },
      ];

      const { result } = renderHook(() => useSharedSpecStore());

      act(() => {
        result.current.updateSpecs(newSpecs);
      });

      expect(result.current.specs).toEqual(newSpecs);
    });
  });

  describe('clearError', () => {
    it('errorをnullにクリアする', async () => {
      vi.mocked(mockApiClient.getSpecs).mockResolvedValue({
        ok: false,
        error: { type: 'NetworkError', message: 'Connection failed' },
      });

      const { result } = renderHook(() => useSharedSpecStore());

      await act(async () => {
        await result.current.loadSpecs(mockApiClient);
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
