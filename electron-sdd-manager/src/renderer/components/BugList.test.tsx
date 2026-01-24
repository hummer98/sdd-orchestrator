/**
 * BugList Component Tests
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1
 *
 * bugs-view-unification Task 4.1: Updated to use BugListContainer
 * bugs-view-unification Task 6.1: Updated to use useSharedBugStore
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugList } from './BugList';
import type { BugMetadata } from '../types';

// Mock the shared bugStore
vi.mock('../../shared/stores/bugStore', () => ({
  useSharedBugStore: vi.fn(),
}));

// Mock the agentStore
vi.mock('../stores/agentStore', () => ({
  useAgentStore: vi.fn(),
}));

// Mock the ApiClientProvider
const mockApiClient = {
  getBugs: vi.fn(),
  getBugDetail: vi.fn(),
};

vi.mock('../../shared/api/ApiClientProvider', () => ({
  useApi: () => mockApiClient,
}));

import { useSharedBugStore } from '../../shared/stores/bugStore';
import { useAgentStore } from '../stores/agentStore';

// Mock BugListItem in shared components (used by BugListContainer)
vi.mock('@shared/components/bug/BugListItem', () => ({
  BugListItem: ({ bug, isSelected, onSelect, runningAgentCount }: { bug: BugMetadata; isSelected: boolean; onSelect: () => void; runningAgentCount?: number }) => (
    <li data-testid={`bug-item-${bug.name}`} data-selected={isSelected} data-running-count={runningAgentCount ?? 0} onClick={onSelect}>
      {bug.name}
    </li>
  ),
}));

describe('BugList', () => {
  const mockBugs: BugMetadata[] = [
    {
      name: 'bug-1',
      path: '/project/.kiro/bugs/bug-1',
      phase: 'reported',
      updatedAt: '2024-01-03T00:00:00Z',
      reportedAt: '2024-01-01T00:00:00Z',
    },
    {
      name: 'bug-2',
      path: '/project/.kiro/bugs/bug-2',
      phase: 'analyzed',
      updatedAt: '2024-01-02T00:00:00Z',
      reportedAt: '2024-01-01T00:00:00Z',
    },
    {
      name: 'bug-3',
      path: '/project/.kiro/bugs/bug-3',
      phase: 'verified',
      updatedAt: '2024-01-01T00:00:00Z',
      reportedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockSelectBug = vi.fn();

  // bugs-view-unification Task 6.1: Updated to use selectedBugId
  const defaultMockState = {
    bugs: mockBugs,
    selectedBugId: null as string | null,
    isLoading: false,
    error: null,
    selectBug: mockSelectBug,
  };

  const defaultAgentMockState = {
    getAgentsForSpec: vi.fn().mockReturnValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSharedBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockState);
    (useAgentStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultAgentMockState);
  });

  // ============================================================
  // Task 6.1: Basic list display
  // Requirements: 2.1, 2.4, 2.5
  // ============================================================
  describe('basic list display', () => {
    it('should render bug list container', () => {
      render(<BugList />);

      expect(screen.getByTestId('bug-list')).toBeInTheDocument();
    });

    it('should display all bugs', () => {
      render(<BugList />);

      expect(screen.getByTestId('bug-item-bug-1')).toBeInTheDocument();
      expect(screen.getByTestId('bug-item-bug-2')).toBeInTheDocument();
      expect(screen.getByTestId('bug-item-bug-3')).toBeInTheDocument();
    });

    it('should display empty message when no bugs', () => {
      (useSharedBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        bugs: [],
      });
      render(<BugList />);

      // bugs-view-unification: testId changed to bug-list-empty
      expect(screen.getByTestId('bug-list-empty')).toBeInTheDocument();
      expect(screen.getByText('Bugがありません')).toBeInTheDocument();
    });

    it('should display loading indicator when loading', () => {
      (useSharedBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });
      render(<BugList />);

      // bugs-view-unification: testId changed to bug-list-loading
      expect(screen.getByTestId('bug-list-loading')).toBeInTheDocument();
    });

    it('should display error message when error', () => {
      (useSharedBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        error: 'Failed to load bugs',
      });
      render(<BugList />);

      // bugs-view-unification: testId changed to bug-list-error
      expect(screen.getByTestId('bug-list-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load bugs')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 6.1: Phase filtering
  // Requirements: 2.1
  // ============================================================
  describe('phase filtering', () => {
    it('should have phase filter dropdown', () => {
      render(<BugList />);

      expect(screen.getByTestId('phase-filter')).toBeInTheDocument();
    });

    it('should filter bugs by phase when selected', () => {
      render(<BugList />);

      const filterSelect = screen.getByTestId('phase-filter');
      fireEvent.change(filterSelect, { target: { value: 'reported' } });

      // Only bug-1 is in reported phase
      expect(screen.getByTestId('bug-item-bug-1')).toBeInTheDocument();
      expect(screen.queryByTestId('bug-item-bug-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bug-item-bug-3')).not.toBeInTheDocument();
    });

    it('should show all bugs when "all" is selected', () => {
      render(<BugList />);

      const filterSelect = screen.getByTestId('phase-filter');
      // First filter to something else
      fireEvent.change(filterSelect, { target: { value: 'reported' } });
      // Then back to all
      fireEvent.change(filterSelect, { target: { value: 'all' } });

      expect(screen.getByTestId('bug-item-bug-1')).toBeInTheDocument();
      expect(screen.getByTestId('bug-item-bug-2')).toBeInTheDocument();
      expect(screen.getByTestId('bug-item-bug-3')).toBeInTheDocument();
    });

    it('should show appropriate empty message when filtered phase has no bugs', () => {
      (useSharedBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        // No bugs in fixed phase
        bugs: mockBugs.filter((b) => b.phase !== 'fixed'),
      });
      render(<BugList />);

      const filterSelect = screen.getByTestId('phase-filter');
      fireEvent.change(filterSelect, { target: { value: 'fixed' } });

      // bugs-view-unification: BugListContainer uses unified empty message
      expect(screen.getByTestId('bug-list-empty')).toBeInTheDocument();
      expect(screen.getByText('Bugがありません')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 6.2: Bug selection
  // Requirements: 2.2, 2.3
  // ============================================================
  describe('bug selection', () => {
    it('should call selectBug when bug is clicked', () => {
      render(<BugList />);

      fireEvent.click(screen.getByTestId('bug-item-bug-1'));

      // bugs-view-unification Task 6.1: selectBug now takes (apiClient, bugName)
      expect(mockSelectBug).toHaveBeenCalledWith(mockApiClient, 'bug-1');
    });

    it('should mark selected bug as selected', () => {
      (useSharedBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        selectedBugId: 'bug-1',
      });
      render(<BugList />);

      const selectedItem = screen.getByTestId('bug-item-bug-1');
      expect(selectedItem).toHaveAttribute('data-selected', 'true');
    });

    // Note: Action buttons and selected bug name are now displayed in App header
    // instead of BugList component (bugs-panel-label-removal fix)
  });

  // ============================================================
  // Bug sorting
  // ============================================================
  describe('sorting', () => {
    it('should sort bugs by updatedAt descending', () => {
      render(<BugList />);

      const items = screen.getAllByTestId(/bug-item-/);
      expect(items[0]).toHaveAttribute('data-testid', 'bug-item-bug-1');
      expect(items[1]).toHaveAttribute('data-testid', 'bug-item-bug-2');
      expect(items[2]).toHaveAttribute('data-testid', 'bug-item-bug-3');
    });
  });

  // ============================================================
  // Filter text color
  // ============================================================
  describe('filter text color', () => {
    it('should have gray text color for filter select (not black)', () => {
      render(<BugList />);

      const filterSelect = screen.getByTestId('phase-filter');
      // Check that select has text-gray-700 class for proper visibility
      expect(filterSelect.className).toContain('text-gray-700');
      expect(filterSelect.className).toContain('dark:text-gray-300');
    });
  });

  // ============================================================
  // Running agent count
  // ============================================================
  describe('running agent count', () => {
    it('should pass runningAgentCount to BugListItem', () => {
      const mockGetAgentsForSpec = vi.fn().mockImplementation((specId: string) => {
        if (specId === 'bug:bug-1') {
          return [
            { agentId: 'agent-1', status: 'running' },
            { agentId: 'agent-2', status: 'running' },
          ];
        }
        if (specId === 'bug:bug-2') {
          return [{ agentId: 'agent-3', status: 'completed' }];
        }
        return [];
      });

      (useAgentStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<BugList />);

      // bug-1 should have 2 running agents
      const bug1Item = screen.getByTestId('bug-item-bug-1');
      expect(bug1Item).toHaveAttribute('data-running-count', '2');

      // bug-2 has 1 agent but it's completed, so 0 running
      const bug2Item = screen.getByTestId('bug-item-bug-2');
      expect(bug2Item).toHaveAttribute('data-running-count', '0');

      // bug-3 has no agents
      const bug3Item = screen.getByTestId('bug-item-bug-3');
      expect(bug3Item).toHaveAttribute('data-running-count', '0');
    });

    it('should call getAgentsForSpec with correct bug specId format', () => {
      const mockGetAgentsForSpec = vi.fn().mockReturnValue([]);

      (useAgentStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<BugList />);

      // Should be called with bug:{bugName} format
      expect(mockGetAgentsForSpec).toHaveBeenCalledWith('bug:bug-1');
      expect(mockGetAgentsForSpec).toHaveBeenCalledWith('bug:bug-2');
      expect(mockGetAgentsForSpec).toHaveBeenCalledWith('bug:bug-3');
    });
  });
});
