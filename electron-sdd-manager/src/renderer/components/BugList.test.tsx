/**
 * BugList Component Tests
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BugList } from './BugList';
import { useBugStore } from '../stores/bugStore';
import type { BugMetadata } from '../types';

// Mock the bugStore
vi.mock('../stores/bugStore', () => ({
  useBugStore: vi.fn(),
}));

// Mock the child components to isolate testing
vi.mock('./BugListItem', () => ({
  BugListItem: ({ bug, isSelected, onSelect }: { bug: BugMetadata; isSelected: boolean; onSelect: () => void }) => (
    <li data-testid={`bug-item-${bug.name}`} data-selected={isSelected} onClick={onSelect}>
      {bug.name}
    </li>
  ),
}));

vi.mock('./BugActionButtons', () => ({
  BugActionButtons: ({ bug }: { bug: BugMetadata }) => (
    <div data-testid="action-buttons">{bug.name}</div>
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

  const defaultMockState = {
    bugs: mockBugs,
    selectedBug: null,
    isLoading: false,
    error: null,
    selectBug: mockSelectBug,
    getSortedBugs: () => [...mockBugs].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    getBugsByPhase: (phase: string) => mockBugs.filter((b) => b.phase === phase),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockState);
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
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        bugs: [],
        getSortedBugs: () => [],
        getBugsByPhase: () => [],
      });
      render(<BugList />);

      expect(screen.getByTestId('empty-message')).toBeInTheDocument();
      expect(screen.getByText('バグがありません')).toBeInTheDocument();
    });

    it('should display loading indicator when loading', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        isLoading: true,
      });
      render(<BugList />);

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('should display error message when error', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        error: 'Failed to load bugs',
      });
      render(<BugList />);

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
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
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        getBugsByPhase: (phase: string) => phase === 'fixed' ? [] : mockBugs.filter((b) => b.phase === phase),
      });
      render(<BugList />);

      const filterSelect = screen.getByTestId('phase-filter');
      fireEvent.change(filterSelect, { target: { value: 'fixed' } });

      expect(screen.getByText('修正済のバグはありません')).toBeInTheDocument();
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

      expect(mockSelectBug).toHaveBeenCalledWith(mockBugs[0]);
    });

    it('should mark selected bug as selected', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        selectedBug: mockBugs[0],
      });
      render(<BugList />);

      const selectedItem = screen.getByTestId('bug-item-bug-1');
      expect(selectedItem).toHaveAttribute('data-selected', 'true');
    });

    it('should show action buttons when bug is selected', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        selectedBug: mockBugs[0],
      });
      render(<BugList />);

      expect(screen.getByTestId('action-buttons')).toBeInTheDocument();
    });

    it('should not show action buttons when no bug is selected', () => {
      render(<BugList />);

      expect(screen.queryByTestId('action-buttons')).not.toBeInTheDocument();
    });

    it('should display selected bug name in action bar', () => {
      (useBugStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultMockState,
        selectedBug: mockBugs[0],
      });
      render(<BugList />);

      // The bug name appears in both the action bar and the list item
      // We verify the action bar by checking the action buttons are present
      expect(screen.getByTestId('action-buttons')).toBeInTheDocument();
      // And the bug name is in the action bar container
      const allBugNames = screen.getAllByText('bug-1');
      expect(allBugNames.length).toBeGreaterThanOrEqual(2); // At least in action bar and list
    });
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
});
