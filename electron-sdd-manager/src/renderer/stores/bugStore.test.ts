/**
 * Bug Store Tests
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * Bug fix: spec-agent-list-not-updating-on-auto-execution
 * - Added projectStore mock for refreshBugs tests (SSOT pattern)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBugStore } from './bugStore';
import type { BugMetadata, BugDetail, BugsChangeEvent } from '../types';

// Mock electronAPI
const mockReadBugs = vi.fn();
const mockReadBugDetail = vi.fn();
const mockStartBugsWatcher = vi.fn();
const mockStopBugsWatcher = vi.fn();
const mockOnBugsChanged = vi.fn();
const mockSwitchAgentWatchScope = vi.fn();

vi.stubGlobal('window', {
  electronAPI: {
    readBugs: mockReadBugs,
    readBugDetail: mockReadBugDetail,
    startBugsWatcher: mockStartBugsWatcher,
    stopBugsWatcher: mockStopBugsWatcher,
    onBugsChanged: mockOnBugsChanged,
    switchAgentWatchScope: mockSwitchAgentWatchScope,
  },
});

// Mock projectStore for refreshBugs (SSOT pattern)
const mockCurrentProject = '/project';
vi.mock('./projectStore', () => ({
  useProjectStore: {
    getState: () => ({
      currentProject: mockCurrentProject,
    }),
  },
}));

const mockBugs: BugMetadata[] = [
  {
    name: 'bug-1',
    path: '/project/.kiro/bugs/bug-1',
    phase: 'reported',
    updatedAt: '2024-01-02T00:00:00Z',
    reportedAt: '2024-01-01T00:00:00Z',
  },
  {
    name: 'bug-2',
    path: '/project/.kiro/bugs/bug-2',
    phase: 'analyzed',
    updatedAt: '2024-01-03T00:00:00Z',
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

const mockBugDetail: BugDetail = {
  metadata: mockBugs[0],
  artifacts: {
    report: { exists: true, path: '/project/.kiro/bugs/bug-1/report.md', updatedAt: '2024-01-01T00:00:00Z' },
    analysis: null,
    fix: null,
    verification: null,
  },
};

describe('bugStore', () => {
  beforeEach(() => {
    // Reset store state
    useBugStore.setState({
      bugs: [],
      selectedBug: null,
      bugDetail: null,
      isLoading: false,
      error: null,
      isWatching: false,
    });

    // Reset mocks
    vi.clearAllMocks();
    mockOnBugsChanged.mockReturnValue(() => {});
  });

  describe('loadBugs', () => {
    it('should load bugs from project path', async () => {
      mockReadBugs.mockResolvedValue(mockBugs);
      mockStartBugsWatcher.mockResolvedValue(undefined);

      await useBugStore.getState().loadBugs('/project');

      expect(mockReadBugs).toHaveBeenCalledWith('/project');
      expect(useBugStore.getState().bugs).toEqual(mockBugs);
      expect(useBugStore.getState().isLoading).toBe(false);
      expect(useBugStore.getState().error).toBeNull();
    });

    it('should set error on failure', async () => {
      mockReadBugs.mockRejectedValue(new Error('Failed to read'));

      await useBugStore.getState().loadBugs('/project');

      expect(useBugStore.getState().error).toBe('Failed to read');
      expect(useBugStore.getState().isLoading).toBe(false);
    });

    it('should register listener after loading', async () => {
      mockReadBugs.mockResolvedValue(mockBugs);

      await useBugStore.getState().loadBugs('/project');

      // Note: Watcher is now started by Main process in SELECT_PROJECT IPC
      // startWatching only registers the event listener
      expect(mockOnBugsChanged).toHaveBeenCalled();
      expect(useBugStore.getState().isWatching).toBe(true);
    });
  });

  describe('selectBug', () => {
    it('should select bug and load detail', async () => {
      mockReadBugDetail.mockResolvedValue(mockBugDetail);

      await useBugStore.getState().selectBug(mockBugs[0]);

      expect(mockReadBugDetail).toHaveBeenCalledWith(mockBugs[0].path);
      expect(useBugStore.getState().selectedBug).toEqual(mockBugs[0]);
      expect(useBugStore.getState().bugDetail).toEqual(mockBugDetail);
    });

    it('should switch agent watch scope with bug:name format', async () => {
      // Bug fix: switchAgentWatchScope expects specId format (bug:{name}), not full path
      mockReadBugDetail.mockResolvedValue(mockBugDetail);

      await useBugStore.getState().selectBug(mockBugs[0]);

      // Should be called with bug:{name} format, not bug.path
      expect(mockSwitchAgentWatchScope).toHaveBeenCalledWith(`bug:${mockBugs[0].name}`);
    });

    it('should set error on failure', async () => {
      mockReadBugDetail.mockRejectedValue(new Error('Failed to read detail'));

      await useBugStore.getState().selectBug(mockBugs[0]);

      expect(useBugStore.getState().error).toBe('Failed to read detail');
    });

    it('should not set loading state in silent mode', async () => {
      mockReadBugDetail.mockResolvedValue(mockBugDetail);

      await useBugStore.getState().selectBug(mockBugs[0], { silent: true });

      // In silent mode, loading state should not be set
      expect(useBugStore.getState().isLoading).toBe(false);
    });
  });

  describe('clearSelectedBug', () => {
    it('should clear selected bug and detail', async () => {
      mockReadBugDetail.mockResolvedValue(mockBugDetail);
      await useBugStore.getState().selectBug(mockBugs[0]);

      useBugStore.getState().clearSelectedBug();

      expect(useBugStore.getState().selectedBug).toBeNull();
      expect(useBugStore.getState().bugDetail).toBeNull();
    });
  });

  describe('refreshBugs', () => {
    it('should refresh bugs list using projectStore.currentProject (SSOT)', async () => {
      // Bug fix: spec-agent-list-not-updating-on-auto-execution
      // refreshBugs now gets project path from projectStore.currentProject (SSOT)
      // No need to call loadBugs first

      mockReadBugs.mockResolvedValue(mockBugs);

      // Directly call refreshBugs (should use projectStore.currentProject)
      await useBugStore.getState().refreshBugs();

      // Should call readBugs with projectStore.currentProject
      expect(mockReadBugs).toHaveBeenCalledWith(mockCurrentProject);
      expect(useBugStore.getState().bugs).toEqual(mockBugs);
    });

    it('should refresh bugs list with updated data', async () => {
      mockReadBugs.mockResolvedValue(mockBugs);

      // First refresh
      await useBugStore.getState().refreshBugs();

      // Update mock to return updated data
      const updatedBugs = [...mockBugs, {
        name: 'bug-4',
        path: '/project/.kiro/bugs/bug-4',
        phase: 'fixed' as const,
        updatedAt: '2024-01-04T00:00:00Z',
        reportedAt: '2024-01-04T00:00:00Z',
      }];
      mockReadBugs.mockResolvedValue(updatedBugs);

      await useBugStore.getState().refreshBugs();

      expect(useBugStore.getState().bugs).toEqual(updatedBugs);
    });
  });

  describe('getSortedBugs', () => {
    it('should return bugs sorted by updatedAt descending', async () => {
      useBugStore.setState({ bugs: mockBugs });

      const sorted = useBugStore.getState().getSortedBugs();

      // Should be sorted by updatedAt desc: bug-2, bug-1, bug-3
      expect(sorted[0].name).toBe('bug-2');
      expect(sorted[1].name).toBe('bug-1');
      expect(sorted[2].name).toBe('bug-3');
    });
  });

  describe('getBugsByPhase', () => {
    it('should return all bugs when phase is "all"', () => {
      useBugStore.setState({ bugs: mockBugs });

      const filtered = useBugStore.getState().getBugsByPhase('all');

      expect(filtered).toHaveLength(3);
    });

    it('should filter bugs by phase', () => {
      useBugStore.setState({ bugs: mockBugs });

      const reported = useBugStore.getState().getBugsByPhase('reported');
      expect(reported).toHaveLength(1);
      expect(reported[0].name).toBe('bug-1');

      const analyzed = useBugStore.getState().getBugsByPhase('analyzed');
      expect(analyzed).toHaveLength(1);
      expect(analyzed[0].name).toBe('bug-2');

      const verified = useBugStore.getState().getBugsByPhase('verified');
      expect(verified).toHaveLength(1);
      expect(verified[0].name).toBe('bug-3');
    });
  });

  describe('startWatching / stopWatching', () => {
    it('should register listener when startWatching is called', async () => {
      // Note: Watcher is now started by Main process in SELECT_PROJECT IPC
      // startWatching only registers the event listener
      await useBugStore.getState().startWatching();

      expect(mockOnBugsChanged).toHaveBeenCalled();
      expect(useBugStore.getState().isWatching).toBe(true);
    });

    it('should stop watching', async () => {
      mockStopBugsWatcher.mockResolvedValue(undefined);

      await useBugStore.getState().startWatching();
      await useBugStore.getState().stopWatching();

      expect(mockStopBugsWatcher).toHaveBeenCalled();
      expect(useBugStore.getState().isWatching).toBe(false);
    });
  });

  describe('handleBugsChanged', () => {
    it('should await updateBugByName before refreshSelectedBugDetail on change event', async () => {
      // Setup: select a bug first
      useBugStore.setState({
        bugs: mockBugs,
        selectedBug: mockBugs[0],
        bugDetail: mockBugDetail,
      });

      // Track call order
      const callOrder: string[] = [];

      // Mock updateBugByName to track when it's called and completed
      const originalUpdateBugByName = useBugStore.getState().updateBugByName;
      const mockUpdateBugByName = vi.fn().mockImplementation(async (bugName: string) => {
        callOrder.push('updateBugByName:start');
        await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate async work
        await originalUpdateBugByName(bugName);
        callOrder.push('updateBugByName:end');
      });

      // Mock refreshSelectedBugDetail to track when it's called
      const originalRefreshSelectedBugDetail = useBugStore.getState().refreshSelectedBugDetail;
      const mockRefreshSelectedBugDetail = vi.fn().mockImplementation(async () => {
        callOrder.push('refreshSelectedBugDetail:start');
        await originalRefreshSelectedBugDetail();
        callOrder.push('refreshSelectedBugDetail:end');
      });

      // Replace methods with mocks
      useBugStore.setState({
        updateBugByName: mockUpdateBugByName,
        refreshSelectedBugDetail: mockRefreshSelectedBugDetail,
      } as Partial<typeof useBugStore extends { getState: () => infer T } ? T : never>);

      // Setup API mocks
      mockReadBugs.mockResolvedValue(mockBugs);
      mockReadBugDetail.mockResolvedValue(mockBugDetail);

      // Trigger change event for selected bug
      const event: BugsChangeEvent = {
        type: 'change',
        path: '/project/.kiro/bugs/bug-1/fix.md',
        bugName: 'bug-1',
      };

      // handleBugsChanged should be awaitable
      await useBugStore.getState().handleBugsChanged(event);

      // Verify updateBugByName was called
      expect(mockUpdateBugByName).toHaveBeenCalledWith('bug-1');

      // Verify refreshSelectedBugDetail was called (since selected bug matches)
      expect(mockRefreshSelectedBugDetail).toHaveBeenCalled();

      // CRITICAL: Verify updateBugByName completed BEFORE refreshSelectedBugDetail started
      const updateEndIndex = callOrder.indexOf('updateBugByName:end');
      const refreshStartIndex = callOrder.indexOf('refreshSelectedBugDetail:start');
      expect(updateEndIndex).toBeLessThan(refreshStartIndex);
    });

    it('should await updateBugByName on add event', async () => {
      useBugStore.setState({ bugs: [] });

      const callOrder: string[] = [];
      mockReadBugs.mockResolvedValue(mockBugs);

      const originalUpdateBugByName = useBugStore.getState().updateBugByName;
      const mockUpdateBugByName = vi.fn().mockImplementation(async (bugName: string) => {
        callOrder.push('updateBugByName:start');
        await originalUpdateBugByName(bugName);
        callOrder.push('updateBugByName:end');
      });

      useBugStore.setState({
        updateBugByName: mockUpdateBugByName,
      } as Partial<typeof useBugStore extends { getState: () => infer T } ? T : never>);

      const event: BugsChangeEvent = {
        type: 'add',
        path: '/project/.kiro/bugs/bug-1/report.md',
        bugName: 'bug-1',
      };

      // Should be awaitable
      await useBugStore.getState().handleBugsChanged(event);

      expect(mockUpdateBugByName).toHaveBeenCalledWith('bug-1');
      expect(callOrder).toContain('updateBugByName:end');
    });

    it('should await updateBugByName and refreshSelectedBugDetail on unlink event for selected bug', async () => {
      useBugStore.setState({
        bugs: mockBugs,
        selectedBug: mockBugs[0],
        bugDetail: mockBugDetail,
      });

      const callOrder: string[] = [];
      mockReadBugs.mockResolvedValue(mockBugs);
      mockReadBugDetail.mockResolvedValue(mockBugDetail);

      const originalUpdateBugByName = useBugStore.getState().updateBugByName;
      const mockUpdateBugByName = vi.fn().mockImplementation(async (bugName: string) => {
        callOrder.push('updateBugByName:start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        await originalUpdateBugByName(bugName);
        callOrder.push('updateBugByName:end');
      });

      const originalRefreshSelectedBugDetail = useBugStore.getState().refreshSelectedBugDetail;
      const mockRefreshSelectedBugDetail = vi.fn().mockImplementation(async () => {
        callOrder.push('refreshSelectedBugDetail:start');
        await originalRefreshSelectedBugDetail();
        callOrder.push('refreshSelectedBugDetail:end');
      });

      useBugStore.setState({
        updateBugByName: mockUpdateBugByName,
        refreshSelectedBugDetail: mockRefreshSelectedBugDetail,
      } as Partial<typeof useBugStore extends { getState: () => infer T } ? T : never>);

      const event: BugsChangeEvent = {
        type: 'unlink',
        path: '/project/.kiro/bugs/bug-1/fix.md',
        bugName: 'bug-1',
      };

      await useBugStore.getState().handleBugsChanged(event);

      expect(mockUpdateBugByName).toHaveBeenCalledWith('bug-1');
      expect(mockRefreshSelectedBugDetail).toHaveBeenCalled();

      // Verify order: updateBugByName must complete before refreshSelectedBugDetail starts
      const updateEndIndex = callOrder.indexOf('updateBugByName:end');
      const refreshStartIndex = callOrder.indexOf('refreshSelectedBugDetail:start');
      expect(updateEndIndex).toBeLessThan(refreshStartIndex);
    });
  });

  // ============================================================
  // bugs-worktree-support Task 10.1: useWorktree state management
  // Requirements: 8.4
  // ============================================================
  describe('useWorktree state', () => {
    it('should have initial useWorktree as false', () => {
      expect(useBugStore.getState().useWorktree).toBe(false);
    });

    it('should update useWorktree with setUseWorktree', () => {
      useBugStore.getState().setUseWorktree(true);
      expect(useBugStore.getState().useWorktree).toBe(true);

      useBugStore.getState().setUseWorktree(false);
      expect(useBugStore.getState().useWorktree).toBe(false);
    });

    it('should initialize useWorktree from default value', () => {
      // Reset store to initial state
      useBugStore.setState({ useWorktree: false });

      // Initialize with default value true
      useBugStore.getState().initializeUseWorktree(true);
      expect(useBugStore.getState().useWorktree).toBe(true);

      // Reset and initialize with default value false
      useBugStore.setState({ useWorktree: true });
      useBugStore.getState().initializeUseWorktree(false);
      expect(useBugStore.getState().useWorktree).toBe(false);
    });
  });

  // Task 1.2: bugs-pane-integration - Bug削除時の選択状態整合性チェック
  // Requirements: 5.4
  describe('refreshBugs - selection consistency', () => {
    it('should clear selectedBug when selected bug is deleted', async () => {
      mockReadBugs.mockResolvedValue(mockBugs);
      mockReadBugDetail.mockResolvedValue(mockBugDetail);
      mockStartBugsWatcher.mockResolvedValue(undefined);

      // Load bugs and select one
      await useBugStore.getState().loadBugs('/project');
      await useBugStore.getState().selectBug(mockBugs[0]);

      expect(useBugStore.getState().selectedBug).toEqual(mockBugs[0]);

      // Simulate bug deletion by returning list without the selected bug
      const bugsWithoutSelected = mockBugs.filter(b => b.path !== mockBugs[0].path);
      mockReadBugs.mockResolvedValue(bugsWithoutSelected);

      // Refresh bugs
      await useBugStore.getState().refreshBugs();

      // Selected bug should be cleared
      expect(useBugStore.getState().selectedBug).toBeNull();
      expect(useBugStore.getState().bugDetail).toBeNull();
    });

    it('should keep selectedBug when selected bug still exists', async () => {
      mockReadBugs.mockResolvedValue(mockBugs);
      mockReadBugDetail.mockResolvedValue(mockBugDetail);
      mockStartBugsWatcher.mockResolvedValue(undefined);

      // Load bugs and select one
      await useBugStore.getState().loadBugs('/project');
      await useBugStore.getState().selectBug(mockBugs[0]);

      expect(useBugStore.getState().selectedBug).toEqual(mockBugs[0]);

      // Refresh with same bugs (selected bug still exists)
      await useBugStore.getState().refreshBugs();

      // Selected bug should still be selected (with refreshed detail)
      expect(useBugStore.getState().selectedBug?.path).toBe(mockBugs[0].path);
    });
  });
});
