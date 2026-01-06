/**
 * BugList + bugStore Integration Tests
 * Requirements: 2.1, 2.2, 2.3, 6.1, 6.3, 6.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BugList } from './BugList';
import { useBugStore } from '../stores/bugStore';
import type { BugMetadata, BugsChangeEvent } from '../types';

vi.mock('../stores/agentStore', () => ({
  useAgentStore: vi.fn(() => ({
    startAgent: vi.fn().mockResolvedValue('agent-123'),
  })),
}));

vi.mock('../stores/notificationStore', () => ({
  useNotificationStore: vi.fn(() => ({
    addNotification: vi.fn(),
  })),
}));

// Mock projectStore for refreshBugs (SSOT pattern)
// Bug fix: spec-agent-list-not-updating-on-auto-execution
vi.mock('../stores/projectStore', () => ({
  useProjectStore: {
    getState: () => ({
      currentProject: '/Users/test/project',
    }),
  },
}));

// Mock electronAPI
const mockReadBugs = vi.fn();
const mockReadBugDetail = vi.fn();
const mockStartBugsWatcher = vi.fn();
const mockStopBugsWatcher = vi.fn();
const mockOnBugsChanged = vi.fn();

vi.stubGlobal('window', {
  electronAPI: {
    readBugs: mockReadBugs,
    readBugDetail: mockReadBugDetail,
    startBugsWatcher: mockStartBugsWatcher,
    stopBugsWatcher: mockStopBugsWatcher,
    onBugsChanged: mockOnBugsChanged,
  },
});

describe('BugList + bugStore Integration', () => {
  const mockBugs: BugMetadata[] = [
    {
      name: 'bug-001',
      path: '/project/.kiro/bugs/bug-001',
      phase: 'reported',
      updatedAt: '2024-01-15T10:00:00Z',
      reportedAt: '2024-01-15T09:00:00Z',
    },
    {
      name: 'bug-002',
      path: '/project/.kiro/bugs/bug-002',
      phase: 'analyzed',
      updatedAt: '2024-01-14T15:00:00Z',
      reportedAt: '2024-01-14T10:00:00Z',
    },
    {
      name: 'bug-003',
      path: '/project/.kiro/bugs/bug-003',
      phase: 'fixed',
      updatedAt: '2024-01-13T12:00:00Z',
      reportedAt: '2024-01-13T08:00:00Z',
    },
  ];

  const mockBugDetail = {
    name: 'bug-001',
    path: '/project/.kiro/bugs/bug-001',
    phase: 'reported',
    description: 'Test bug description',
    reportContent: 'Bug report content',
    analysisContent: null,
    fixContent: null,
    verifyContent: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset bugStore state
    useBugStore.setState({
      bugs: [],
      selectedBug: null,
      bugDetail: null,
      isLoading: false,
      error: null,
      isWatching: false,
    });

    // Default mock implementations
    mockReadBugs.mockResolvedValue(mockBugs);
    mockReadBugDetail.mockResolvedValue(mockBugDetail);
    mockStartBugsWatcher.mockResolvedValue(undefined);
    mockStopBugsWatcher.mockResolvedValue(undefined);
    mockOnBugsChanged.mockReturnValue(() => {});
  });

  afterEach(() => {
    useBugStore.setState({
      bugs: [],
      selectedBug: null,
      bugDetail: null,
      isLoading: false,
      error: null,
      isWatching: false,
    });
  });

  // ============================================================
  // Task 10.1: Bug list display and selection
  // Requirements: 2.1, 2.2, 2.3
  // ============================================================
  describe('bug list display and selection', () => {
    it('should display bugs after loading', async () => {
      // Set bugs in store
      useBugStore.setState({ bugs: mockBugs });

      render(<BugList />);

      expect(screen.getByText('bug-001')).toBeInTheDocument();
      expect(screen.getByText('bug-002')).toBeInTheDocument();
      expect(screen.getByText('bug-003')).toBeInTheDocument();
    });

    it('should update selection when bug is clicked', async () => {
      useBugStore.setState({ bugs: mockBugs });

      const { container } = render(<BugList />);

      // Click on bug-002
      fireEvent.click(screen.getByText('bug-002'));

      // Verify store was updated (use poll-based check since selectBug is async)
      await waitFor(
        () => {
          const state = useBugStore.getState();
          expect(state.selectedBug?.name).toBe('bug-002');
        },
        { container }
      );
    });

    // Note: Action buttons are now displayed in App header instead of BugList
    // (bugs-panel-label-removal fix)

    it('should filter bugs by phase', async () => {
      useBugStore.setState({ bugs: mockBugs });

      render(<BugList />);

      // Select 'analyzed' filter
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'analyzed' } });

      // Only bug-002 should be visible
      expect(screen.queryByText('bug-001')).not.toBeInTheDocument();
      expect(screen.getByText('bug-002')).toBeInTheDocument();
      expect(screen.queryByText('bug-003')).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 10.1: Store integration
  // Requirements: 6.1, 6.3
  // ============================================================
  describe('store integration', () => {
    it('should call loadBugs via store action', async () => {
      // Simulate loading via store
      await act(async () => {
        await useBugStore.getState().loadBugs('/Users/test/project');
      });

      expect(mockReadBugs).toHaveBeenCalledWith('/Users/test/project');
      expect(useBugStore.getState().bugs).toEqual(mockBugs);
    });

    it('should handle loadBugs error', async () => {
      mockReadBugs.mockRejectedValue(new Error('Failed to load'));

      await act(async () => {
        await useBugStore.getState().loadBugs('/Users/test/project');
      });

      expect(useBugStore.getState().error).toBe('Failed to load');
      expect(useBugStore.getState().bugs).toEqual([]);
    });

    it('should update selectedBug via selectBug action', async () => {
      useBugStore.setState({ bugs: mockBugs });

      await act(async () => {
        await useBugStore.getState().selectBug(mockBugs[1]);
      });

      expect(useBugStore.getState().selectedBug?.name).toBe('bug-002');
    });

    it('should clear selection via clearSelectedBug', async () => {
      useBugStore.setState({ bugs: mockBugs, selectedBug: mockBugs[0] });

      act(() => {
        useBugStore.getState().clearSelectedBug();
      });

      expect(useBugStore.getState().selectedBug).toBeNull();
    });
  });

  // ============================================================
  // Task 10.1: File change auto-update
  // Requirements: 6.5
  // ============================================================
  describe('file change auto-update', () => {
    it('should register watcher callback via startWatching', async () => {
      // Note: Watcher is now started by Main process in SELECT_PROJECT IPC
      // startWatching only registers the event listener
      await act(async () => {
        await useBugStore.getState().startWatching();
      });

      expect(mockOnBugsChanged).toHaveBeenCalled();
    });

    it('should stop watcher via stopWatching', async () => {
      await act(async () => {
        await useBugStore.getState().stopWatching();
      });

      expect(mockStopBugsWatcher).toHaveBeenCalled();
    });

    it('should update bugs when file change event triggers refresh', async () => {
      // First load bugs to set the project path
      mockReadBugs.mockResolvedValueOnce(mockBugs);

      await act(async () => {
        await useBugStore.getState().loadBugs('/Users/test/project');
      });

      // Now simulate a refresh with updated data
      const updatedBugs: BugMetadata[] = [
        ...mockBugs,
        {
          name: 'bug-004',
          path: '/project/.kiro/bugs/bug-004',
          phase: 'reported',
          updatedAt: '2024-01-16T10:00:00Z',
          reportedAt: '2024-01-16T10:00:00Z',
        },
      ];

      mockReadBugs.mockResolvedValueOnce(updatedBugs);

      await act(async () => {
        await useBugStore.getState().refreshBugs();
      });

      expect(useBugStore.getState().bugs).toEqual(updatedBugs);
    });
  });

  // ============================================================
  // Task 10.1: Empty states
  // Requirements: 2.4, 2.5
  // ============================================================
  describe('empty states', () => {
    it('should show empty message when no bugs exist', () => {
      useBugStore.setState({ bugs: [] });

      render(<BugList />);

      expect(screen.getByText('バグがありません')).toBeInTheDocument();
    });

    it('should show filtered empty message when filter has no matches', () => {
      useBugStore.setState({ bugs: mockBugs });

      render(<BugList />);

      // Select 'verified' filter (no bugs in this phase)
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'verified' } });

      expect(screen.getByText('検証済のバグはありません')).toBeInTheDocument();
    });
  });
});
