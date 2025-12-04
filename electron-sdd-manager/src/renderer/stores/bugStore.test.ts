/**
 * Bug Store Tests
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
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

vi.stubGlobal('window', {
  electronAPI: {
    readBugs: mockReadBugs,
    readBugDetail: mockReadBugDetail,
    startBugsWatcher: mockStartBugsWatcher,
    stopBugsWatcher: mockStopBugsWatcher,
    onBugsChanged: mockOnBugsChanged,
  },
});

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

    it('should start watching after loading', async () => {
      mockReadBugs.mockResolvedValue(mockBugs);
      mockStartBugsWatcher.mockResolvedValue(undefined);

      await useBugStore.getState().loadBugs('/project');

      expect(mockStartBugsWatcher).toHaveBeenCalled();
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
    it('should refresh bugs list', async () => {
      mockReadBugs.mockResolvedValue(mockBugs);
      mockStartBugsWatcher.mockResolvedValue(undefined);

      // First load
      await useBugStore.getState().loadBugs('/project');

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
    it('should start watching', async () => {
      mockStartBugsWatcher.mockResolvedValue(undefined);

      await useBugStore.getState().startWatching();

      expect(mockStartBugsWatcher).toHaveBeenCalled();
      expect(useBugStore.getState().isWatching).toBe(true);
    });

    it('should stop watching', async () => {
      mockStartBugsWatcher.mockResolvedValue(undefined);
      mockStopBugsWatcher.mockResolvedValue(undefined);

      await useBugStore.getState().startWatching();
      await useBugStore.getState().stopWatching();

      expect(mockStopBugsWatcher).toHaveBeenCalled();
      expect(useBugStore.getState().isWatching).toBe(false);
    });
  });
});
