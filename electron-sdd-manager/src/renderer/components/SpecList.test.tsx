/**
 * SpecList Component Tests
 * Task 33.1: SpecList update with running agent count
 * Requirements: 2.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecList } from './SpecList';
import { useSpecStore } from '../stores/specStore';
import type { SpecMetadata, SpecPhase } from '../types';

// Mock the stores
vi.mock('../stores/specStore');
vi.mock('@shared/stores/agentStore');

// zustand-selector-optimization: Helper to mock store with selector support
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockStoreWithSelector(store: ReturnType<typeof vi.fn>, state: Record<string, any>) {
  store.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (selector?: (s: any) => any) => selector ? selector(state) : state
  );
}
const mockUseSpecStore = useSpecStore as unknown as ReturnType<typeof vi.fn>;

// agent-facade-action-only Task 6.4: Mock useSharedAgentStore instead of useAgentStore
import { useSharedAgentStore } from '@shared/stores/agentStore';
const mockUseSharedAgentStore = useSharedAgentStore as unknown as ReturnType<typeof vi.fn>;

describe('SpecList - Task 33.1', () => {
  const mockSelectSpec = vi.fn();
  const mockSetSortBy = vi.fn();
  const mockSetSortOrder = vi.fn();
  const mockSetStatusFilter = vi.fn();
  const mockGetSortedFilteredSpecs = vi.fn();
  // agent-facade-action-only Task 6.4: No longer using getRunningAgentCount from facade
  // Component computes running count from SSOT agents Map via useCallback

  const baseSpec: SpecMetadata = {
    name: 'feature-1',
    path: '/path/to/feature-1',
    phase: 'tasks-generated' as SpecPhase,
    updatedAt: '2025-01-01T00:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockStoreWithSelector(mockUseSpecStore, {
      selectedSpec: null,
      sortBy: 'name',
      sortOrder: 'asc',
      statusFilter: 'all',
      isLoading: false,
      error: null,
      selectSpec: mockSelectSpec,
      setSortBy: mockSetSortBy,
      setSortOrder: mockSetSortOrder,
      setStatusFilter: mockSetStatusFilter,
      getSortedFilteredSpecs: mockGetSortedFilteredSpecs.mockReturnValue([baseSpec]),
      // git-worktree-support: Task 11.2 - Add specJsonMap to mock
      specJsonMap: new Map(),
    });

    // agent-facade-action-only Task 6.4: SSOT provides agents Map (no running agents by default)
    mockStoreWithSelector(mockUseSharedAgentStore, {
      agents: new Map(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Running agent count display', () => {
    it('should display spec list without agent count when no agents', () => {
      render(<SpecList />);

      expect(screen.getByText('feature-1')).toBeInTheDocument();
      expect(screen.queryByTestId('agent-count-feature-1')).not.toBeInTheDocument();
    });

    // agent-facade-action-only Task 6.4: Running count computed from SSOT agents Map
    it('should display running agent count badge when agents are running', () => {
      // Set up SSOT with 1 running agent for feature-1
      mockStoreWithSelector(mockUseSharedAgentStore, {
        agents: new Map([['feature-1', [{ agentId: 'a1', status: 'running' }]]]),
      });

      render(<SpecList />);

      // SpecListItem uses 'running-agent-count' testid
      const agentCountBadge = screen.getByTestId('running-agent-count');
      expect(agentCountBadge).toBeInTheDocument();
      expect(agentCountBadge).toHaveTextContent('1');
    });

    it('should display correct count for multiple running agents', () => {
      // Set up SSOT with 2 running agents for feature-1
      mockStoreWithSelector(mockUseSharedAgentStore, {
        agents: new Map([['feature-1', [
          { agentId: 'a1', status: 'running' },
          { agentId: 'a2', status: 'running' },
        ]]]),
      });

      render(<SpecList />);

      const agentCountBadge = screen.getByTestId('running-agent-count');
      expect(agentCountBadge).toHaveTextContent('2');
    });

    it('should only count running agents', () => {
      // 1 running + 1 completed = count should be 1
      mockStoreWithSelector(mockUseSharedAgentStore, {
        agents: new Map([['feature-1', [
          { agentId: 'a1', status: 'running' },
          { agentId: 'a2', status: 'completed' },
        ]]]),
      });

      render(<SpecList />);

      const agentCountBadge = screen.getByTestId('running-agent-count');
      expect(agentCountBadge).toHaveTextContent('1');
    });
  });

  describe('Filter text color', () => {
    it('should have gray text color for filter select (not black)', () => {
      render(<SpecList />);

      const filterSelect = screen.getByTestId('status-filter');
      // Check that select has text-gray-700 class for proper visibility
      expect(filterSelect.className).toContain('text-gray-700');
      expect(filterSelect.className).toContain('dark:text-gray-300');
    });
  });

  // ============================================================
  // spec-phase-auto-update Task 2: SpecListステータス表示更新
  // Requirements: 4.1, 4.2
  // ============================================================
  describe('SpecPhase display for new phases', () => {
    it('should display inspection-complete phase with correct label', () => {
      const inspectionCompleteSpec: SpecMetadata = {
        ...baseSpec,
        name: 'inspection-complete-feature',
        phase: 'inspection-complete' as SpecPhase,
      };

      mockGetSortedFilteredSpecs.mockReturnValue([inspectionCompleteSpec]);
      mockStoreWithSelector(mockUseSpecStore, {
        selectedSpec: null,
        sortBy: 'name',
        sortOrder: 'asc',
        statusFilter: 'all',
        isLoading: false,
        error: null,
        selectSpec: mockSelectSpec,
        setSortBy: mockSetSortBy,
        setSortOrder: mockSetSortOrder,
        setStatusFilter: mockSetStatusFilter,
        getSortedFilteredSpecs: mockGetSortedFilteredSpecs,
        // git-worktree-support: Task 11.2 - Add specJsonMap to mock
        specJsonMap: new Map(),
      });

      render(<SpecList />);

      expect(screen.getByText('inspection-complete-feature')).toBeInTheDocument();
      // Use getAllByText because the label appears in both filter options and spec badge
      const labels = screen.getAllByText('検査完了');
      expect(labels.length).toBeGreaterThanOrEqual(1);
      // Verify there's a span element with the label (the badge in spec item)
      expect(labels.some(el => el.tagName === 'SPAN')).toBe(true);
    });

    it('should display deploy-complete phase with correct label', () => {
      const deployCompleteSpec: SpecMetadata = {
        ...baseSpec,
        name: 'deploy-complete-feature',
        phase: 'deploy-complete' as SpecPhase,
      };

      mockGetSortedFilteredSpecs.mockReturnValue([deployCompleteSpec]);
      mockStoreWithSelector(mockUseSpecStore, {
        selectedSpec: null,
        sortBy: 'name',
        sortOrder: 'asc',
        statusFilter: 'all',
        isLoading: false,
        error: null,
        selectSpec: mockSelectSpec,
        setSortBy: mockSetSortBy,
        setSortOrder: mockSetSortOrder,
        setStatusFilter: mockSetStatusFilter,
        getSortedFilteredSpecs: mockGetSortedFilteredSpecs,
        // git-worktree-support: Task 11.2 - Add specJsonMap to mock
        specJsonMap: new Map(),
      });

      render(<SpecList />);

      expect(screen.getByText('deploy-complete-feature')).toBeInTheDocument();
      // Use getAllByText because the label appears in both filter options and spec badge
      const labels = screen.getAllByText('デプロイ完了');
      expect(labels.length).toBeGreaterThanOrEqual(1);
      // Verify there's a span element with the label (the badge in spec item)
      expect(labels.some(el => el.tagName === 'SPAN')).toBe(true);
    });
  });

  // ============================================================
  // Bug fix: Worktree badge display
  // Only show worktree badge when worktree.path exists (actual worktree mode)
  // ============================================================
  describe('Worktree badge display', () => {
    it('should display worktree badge when worktree.path exists', () => {
      const specWithWorktree: SpecMetadata = {
        ...baseSpec,
        name: 'worktree-feature',
      };

      mockGetSortedFilteredSpecs.mockReturnValue([specWithWorktree]);
      const specJsonMap = new Map();
      specJsonMap.set('worktree-feature', {
        worktree: {
          path: '../sdd-orchestrator-worktrees/worktree-feature',
          branch: 'feature/worktree-feature',
          created_at: '2025-01-01T00:00:00Z',
        },
      });

      mockStoreWithSelector(mockUseSpecStore, {
        selectedSpec: null,
        sortBy: 'name',
        sortOrder: 'asc',
        statusFilter: 'all',
        isLoading: false,
        error: null,
        selectSpec: mockSelectSpec,
        setSortBy: mockSetSortBy,
        setSortOrder: mockSetSortOrder,
        setStatusFilter: mockSetStatusFilter,
        getSortedFilteredSpecs: mockGetSortedFilteredSpecs,
        specJsonMap,
      });

      render(<SpecList />);

      // SpecListItem uses 'worktree-badge' testid (not 'worktree-badge-{specName}')
      expect(screen.getByTestId('worktree-badge')).toBeInTheDocument();
    });

    it('should NOT display worktree badge when worktree exists but path is missing (normal mode)', () => {
      const specWithNormalMode: SpecMetadata = {
        ...baseSpec,
        name: 'normal-mode-feature',
      };

      mockGetSortedFilteredSpecs.mockReturnValue([specWithNormalMode]);
      const specJsonMap = new Map();
      // Normal mode: worktree object exists but without path
      specJsonMap.set('normal-mode-feature', {
        worktree: {
          branch: 'master',
          created_at: '2025-01-01T00:00:00Z',
        },
      });

      mockStoreWithSelector(mockUseSpecStore, {
        selectedSpec: null,
        sortBy: 'name',
        sortOrder: 'asc',
        statusFilter: 'all',
        isLoading: false,
        error: null,
        selectSpec: mockSelectSpec,
        setSortBy: mockSetSortBy,
        setSortOrder: mockSetSortOrder,
        setStatusFilter: mockSetStatusFilter,
        getSortedFilteredSpecs: mockGetSortedFilteredSpecs,
        specJsonMap,
      });

      render(<SpecList />);

      // SpecListItem uses 'worktree-badge' testid (not 'worktree-badge-{specName}')
      expect(screen.queryByTestId('worktree-badge')).not.toBeInTheDocument();
    });

    it('should NOT display worktree badge when worktree is undefined', () => {
      const specWithoutWorktree: SpecMetadata = {
        ...baseSpec,
        name: 'no-worktree-feature',
      };

      mockGetSortedFilteredSpecs.mockReturnValue([specWithoutWorktree]);
      const specJsonMap = new Map();
      // No worktree field at all
      specJsonMap.set('no-worktree-feature', {});

      mockStoreWithSelector(mockUseSpecStore, {
        selectedSpec: null,
        sortBy: 'name',
        sortOrder: 'asc',
        statusFilter: 'all',
        isLoading: false,
        error: null,
        selectSpec: mockSelectSpec,
        setSortBy: mockSetSortBy,
        setSortOrder: mockSetSortOrder,
        setStatusFilter: mockSetStatusFilter,
        getSortedFilteredSpecs: mockGetSortedFilteredSpecs,
        specJsonMap,
      });

      render(<SpecList />);

      // SpecListItem uses 'worktree-badge' testid (not 'worktree-badge-{specName}')
      expect(screen.queryByTestId('worktree-badge')).not.toBeInTheDocument();
    });
  });
});
