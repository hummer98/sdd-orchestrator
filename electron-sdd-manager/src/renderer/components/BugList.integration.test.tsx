/**
 * BugList + bugStore Integration Tests
 * Requirements: 2.1, 2.2, 2.3, 6.1, 6.3, 6.5
 *
 * bugs-view-unification Task 6.1: Updated to use useSharedBugStore
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BugList } from './BugList';
import { useSharedBugStore, resetSharedBugStore } from '../../shared/stores/bugStore';
import type { BugMetadata, BugsChangeEvent } from '../types';
import type { ApiClient } from '../../shared/api/types';

vi.mock('../stores/agentStore', () => ({
  useAgentStore: vi.fn(() => ({
    startAgent: vi.fn().mockResolvedValue('agent-123'),
    getAgentsForSpec: vi.fn().mockReturnValue([]),
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

// Mock ApiClient for the shared bugStore
const mockGetBugs = vi.fn();
const mockGetBugDetail = vi.fn();
const mockStartBugsWatcher = vi.fn();
const mockStopBugsWatcher = vi.fn();
const mockOnBugsChanged = vi.fn();

const mockApiClient: Partial<ApiClient> = {
  getBugs: mockGetBugs,
  getBugDetail: mockGetBugDetail,
  startBugsWatcher: mockStartBugsWatcher,
  stopBugsWatcher: mockStopBugsWatcher,
  onBugsChanged: mockOnBugsChanged,
};

// Mock the ApiClientProvider
vi.mock('../../shared/api/ApiClientProvider', () => ({
  useApi: () => mockApiClient,
}));

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
    metadata: {
      name: 'bug-001',
      phase: 'reported',
      reportedAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    artifacts: {
      report: { exists: true, content: 'Bug report content' },
      analysis: { exists: false, content: null },
      fix: { exists: false, content: null },
      verification: { exists: false, content: null },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset shared bugStore state
    resetSharedBugStore();

    // Default mock implementations
    mockGetBugs.mockResolvedValue({ ok: true, value: mockBugs });
    mockGetBugDetail.mockResolvedValue({ ok: true, value: mockBugDetail });
    mockStartBugsWatcher.mockResolvedValue({ ok: true, value: undefined });
    mockStopBugsWatcher.mockResolvedValue({ ok: true, value: undefined });
    mockOnBugsChanged.mockReturnValue(() => {});
  });

  afterEach(() => {
    resetSharedBugStore();
  });

  // ============================================================
  // Task 10.1: Bug list display and selection
  // Requirements: 2.1, 2.2, 2.3
  // ============================================================
  describe('bug list display and selection', () => {
    it('should display bugs after loading', async () => {
      // Set bugs in store
      useSharedBugStore.setState({ bugs: mockBugs });

      render(<BugList />);

      expect(screen.getByText('bug-001')).toBeInTheDocument();
      expect(screen.getByText('bug-002')).toBeInTheDocument();
      expect(screen.getByText('bug-003')).toBeInTheDocument();
    });

    it('should update selection when bug is clicked', async () => {
      useSharedBugStore.setState({ bugs: mockBugs });

      const { container } = render(<BugList />);

      // Click on bug-002
      fireEvent.click(screen.getByText('bug-002'));

      // Verify store was updated (use poll-based check since selectBug is async)
      await waitFor(
        () => {
          const state = useSharedBugStore.getState();
          expect(state.selectedBugId).toBe('bug-002');
        },
        { container }
      );
    });

    // Note: Action buttons are now displayed in App header instead of BugList
    // (bugs-panel-label-removal fix)

    it('should filter bugs by phase', async () => {
      useSharedBugStore.setState({ bugs: mockBugs });

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
  // bugs-view-unification Task 6.1: Updated to use shared store API
  // ============================================================
  describe('store integration', () => {
    it('should call loadBugs via store action', async () => {
      await act(async () => {
        await useSharedBugStore.getState().loadBugs(mockApiClient as ApiClient);
      });

      expect(mockGetBugs).toHaveBeenCalled();
      expect(useSharedBugStore.getState().bugs).toEqual(mockBugs);
    });

    it('should handle loadBugs error', async () => {
      mockGetBugs.mockResolvedValue({ ok: false, error: { type: 'API_ERROR', message: 'Failed to load' } });

      await act(async () => {
        await useSharedBugStore.getState().loadBugs(mockApiClient as ApiClient);
      });

      expect(useSharedBugStore.getState().error).toBe('Failed to load');
      expect(useSharedBugStore.getState().bugs).toEqual([]);
    });

    it('should update selectedBugId via selectBug action', async () => {
      useSharedBugStore.setState({ bugs: mockBugs });

      await act(async () => {
        await useSharedBugStore.getState().selectBug(mockApiClient as ApiClient, 'bug-002');
      });

      expect(useSharedBugStore.getState().selectedBugId).toBe('bug-002');
    });

    it('should clear selection via clearSelectedBug', async () => {
      useSharedBugStore.setState({ bugs: mockBugs, selectedBugId: 'bug-001' });

      act(() => {
        useSharedBugStore.getState().clearSelectedBug();
      });

      expect(useSharedBugStore.getState().selectedBugId).toBeNull();
    });
  });

  // ============================================================
  // Task 10.1: File change auto-update
  // Requirements: 6.5
  // bugs-view-unification Task 6.1: Updated to use shared store API
  // ============================================================
  describe('file change auto-update', () => {
    it('should register watcher callback via startWatching', async () => {
      await act(async () => {
        useSharedBugStore.getState().startWatching(mockApiClient as ApiClient);
      });

      expect(mockOnBugsChanged).toHaveBeenCalled();
    });

    it('should stop watcher via stopWatching', async () => {
      await act(async () => {
        await useSharedBugStore.getState().stopWatching(mockApiClient as ApiClient);
      });

      expect(mockStopBugsWatcher).toHaveBeenCalled();
    });

    it('should update bugs when updateBugs is called', async () => {
      // First set initial bugs
      useSharedBugStore.setState({ bugs: mockBugs });

      // Now update with new bugs
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

      act(() => {
        useSharedBugStore.getState().updateBugs(updatedBugs);
      });

      expect(useSharedBugStore.getState().bugs).toEqual(updatedBugs);
    });
  });

  // ============================================================
  // Task 10.1: Empty states
  // Requirements: 2.4, 2.5
  // ============================================================
  describe('empty states', () => {
    it('should show empty message when no bugs exist', () => {
      useSharedBugStore.setState({ bugs: [] });

      render(<BugList />);

      // bugs-view-unification: Empty message changed to unified format
      expect(screen.getByText('Bugがありません')).toBeInTheDocument();
    });

    it('should show filtered empty message when filter has no matches', () => {
      useSharedBugStore.setState({ bugs: mockBugs });

      render(<BugList />);

      // Select 'verified' filter (no bugs in this phase)
      const filterSelect = screen.getByRole('combobox');
      fireEvent.change(filterSelect, { target: { value: 'verified' } });

      // bugs-view-unification: BugListContainer uses unified empty message
      expect(screen.getByText('Bugがありません')).toBeInTheDocument();
    });
  });
});
