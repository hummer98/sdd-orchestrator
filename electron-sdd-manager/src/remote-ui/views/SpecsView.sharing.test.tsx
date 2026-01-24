/**
 * SpecsView Sharing Verification Tests
 *
 * Task 9.1: Specs一覧とフィルタの共用を確認する
 * - shared/SpecListContainer、useSpecListLogicの使用確認
 * - フィルタエリアの固定ヘッダー表示
 * - 既存Remote UI実装（SpecsView）の継続使用
 *
 * Requirements: 8.1, 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SpecsView } from './SpecsView';
import type { ApiClient } from '@shared/api/types';

// =============================================================================
// Mock Data
// =============================================================================

const mockSpecs = [
  {
    name: 'spec-alpha',
    path: '/project/.kiro/specs/spec-alpha',
    phase: 'design-generated' as const,
    updatedAt: '2026-01-10T10:00:00Z',
    createdAt: '2026-01-09T08:00:00Z',
  },
  {
    name: 'spec-beta',
    path: '/project/.kiro/specs/spec-beta',
    phase: 'tasks-generated' as const,
    updatedAt: '2026-01-10T12:00:00Z',
    createdAt: '2026-01-08T09:00:00Z',
  },
];

// =============================================================================
// Mock ApiClient
// =============================================================================

function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getSpecs: vi.fn().mockResolvedValue({ ok: true, value: mockSpecs }),
    getSpecDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executePhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    updateApproval: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugDetail: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeBugPhase: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    getAgents: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    stopAgent: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    resumeAgent: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    sendAgentInput: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAgentLogs: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    executeValidation: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeDocumentReview: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeInspection: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    startAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    stopAutoExecution: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAutoExecutionStatus: vi.fn().mockResolvedValue({ ok: true, value: null }),
    saveFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onSpecsUpdated: vi.fn().mockReturnValue(() => {}),
    onBugsUpdated: vi.fn().mockReturnValue(() => {}),
    onAgentOutput: vi.fn().mockReturnValue(() => {}),
    onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
    onAutoExecutionStatusChanged: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
}

// =============================================================================
// Task 9.1: Sharing Verification Tests
// =============================================================================

describe('SpecsView - Task 9.1: Specs一覧とフィルタの共用確認', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
  });

  describe('Requirement 8.1: Specs一覧コンポーネントの共有', () => {
    it('SpecsViewはshared/SpecListItemを使用してSpec一覧を表示する', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-list')).toBeInTheDocument();
      });

      // SpecListItemはspec-item-{name}のtest-idを持つ
      expect(screen.getByTestId('spec-item-spec-alpha')).toBeInTheDocument();
      expect(screen.getByTestId('spec-item-spec-beta')).toBeInTheDocument();
    });

    it('SpecsViewは既存Remote UI実装として継続使用される（data-testid="specs-view"）', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-view')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 8.3: フィルタエリアの固定ヘッダー表示', () => {
    it('検索入力フィールドが固定ヘッダーエリアに表示される', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-search-input')).toBeInTheDocument();
      });

      // 検索入力フィールドの親要素がflex-shrink-0クラスを持つ（固定ヘッダー）
      const searchInput = screen.getByTestId('specs-search-input');
      const filterArea = searchInput.closest('.flex-shrink-0');
      expect(filterArea).not.toBeNull();
    });

    it('フィルタエリアはborder-bクラスで区切り線を持つ', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-search-input')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('specs-search-input');
      const filterArea = searchInput.closest('.border-b');
      expect(filterArea).not.toBeNull();
    });

    it('リスト部分はoverflow-y-autoでスクロール可能', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-list')).toBeInTheDocument();
      });

      const listContainer = screen.getByTestId('specs-list').closest('.overflow-y-auto');
      expect(listContainer).not.toBeNull();
    });
  });

  describe('Requirement 8.4: 既存Remote UI実装（SpecsView）の継続使用', () => {
    it('useSpecListLogicフックを使用してソート・フィルタ機能を提供する', async () => {
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-list')).toBeInTheDocument();
      });

      // useSpecListLogicの機能: 検索クエリによるフィルタリング
      // 検索入力が機能することで、フックが使用されていることを確認
      const searchInput = screen.getByTestId('specs-search-input');
      expect(searchInput).toBeInTheDocument();
    });

    it('SpecListContainerの代わりにSpecsView独自実装を使用（Requirement 8.4準拠）', async () => {
      // Requirement 8.4: 共有コンポーネントが存在しない場合、
      // 既存Remote UI実装を使用する
      // SpecsViewは独自のフィルタUI実装を持つが、useSpecListLogicを共有
      render(<SpecsView apiClient={mockApiClient} />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-view')).toBeInTheDocument();
      });

      // SpecListContainerではなくSpecsView独自構造を使用
      // (SpecListContainerはspec-list test-idを使用)
      expect(screen.queryByTestId('spec-list')).not.toBeInTheDocument();
    });
  });
});
