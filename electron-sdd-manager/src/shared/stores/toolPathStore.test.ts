/**
 * toolPathStore Tests
 * well-known-tool-paths feature
 * Task 4.2: toolPathStoreユニットテストを作成する
 *
 * Requirements: 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ToolStatus, ToolResolutionResult } from '../../renderer/types/electron';

// Mock window.electronAPI before importing the store
const mockGetStatuses = vi.fn<[], Promise<ToolStatus[]>>();
const mockSetPath = vi.fn<[string, string | null], Promise<ToolResolutionResult>>();
const mockResolve = vi.fn<[string], Promise<ToolResolutionResult>>();

vi.stubGlobal('window', {
  electronAPI: {
    toolPath: {
      getStatuses: mockGetStatuses,
      setPath: mockSetPath,
      resolve: mockResolve,
    },
  },
});

// Import after mocking
import {
  useToolPathStore,
  resetToolPathStore,
  getToolPathStore,
} from './toolPathStore';

// =============================================================================
// Test Data
// =============================================================================

const mockStatuses: ToolStatus[] = [
  {
    definition: {
      name: 'claude',
      required: true,
      versionCommand: '--version',
      installGuidance: 'Install Claude Code',
    },
    resolution: {
      resolved: true,
      path: '/opt/homebrew/bin/claude',
      source: 'well-known',
    },
  },
  {
    definition: {
      name: 'jj',
      required: false,
      versionCommand: '--version',
      installGuidance: 'brew install jj',
    },
    resolution: {
      resolved: false,
      source: 'not-found',
      error: 'jj not found',
    },
  },
  {
    definition: {
      name: 'jq',
      required: false,
      versionCommand: '--version',
      installGuidance: 'brew install jq',
    },
    resolution: {
      resolved: true,
      path: '/usr/local/bin/jq',
      source: 'well-known',
    },
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('toolPathStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetToolPathStore();
  });

  afterEach(() => {
    resetToolPathStore();
  });

  describe('initial state', () => {
    it('should have empty statuses initially', () => {
      const store = getToolPathStore();
      expect(store.statuses).toEqual([]);
    });

    it('should not be loading initially', () => {
      const store = getToolPathStore();
      expect(store.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const store = getToolPathStore();
      expect(store.error).toBeNull();
    });
  });

  describe('fetchStatuses', () => {
    it('should set isLoading to true while fetching', async () => {
      // Mock that returns after a delay to capture loading state
      mockGetStatuses.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockStatuses), 10);
          })
      );

      const fetchPromise = getToolPathStore().fetchStatuses();

      // Check loading state immediately
      expect(getToolPathStore().isLoading).toBe(true);

      await fetchPromise;
      expect(getToolPathStore().isLoading).toBe(false);
    });

    it('should update statuses on success', async () => {
      mockGetStatuses.mockResolvedValue(mockStatuses);

      await getToolPathStore().fetchStatuses();

      const store = getToolPathStore();
      expect(store.statuses).toEqual(mockStatuses);
      expect(store.error).toBeNull();
    });

    it('should call electronAPI.toolPath.getStatuses', async () => {
      mockGetStatuses.mockResolvedValue(mockStatuses);

      await getToolPathStore().fetchStatuses();

      expect(mockGetStatuses).toHaveBeenCalledTimes(1);
    });

    it('should set error on failure', async () => {
      const errorMessage = 'Failed to fetch statuses';
      mockGetStatuses.mockRejectedValue(new Error(errorMessage));

      await getToolPathStore().fetchStatuses();

      const store = getToolPathStore();
      expect(store.error).toBe(errorMessage);
      expect(store.statuses).toEqual([]);
    });
  });

  describe('setToolPath', () => {
    beforeEach(async () => {
      // Initialize with mock statuses first
      mockGetStatuses.mockResolvedValue(mockStatuses);
      await getToolPathStore().fetchStatuses();
    });

    it('should call electronAPI.toolPath.setPath with correct arguments', async () => {
      const newPath = '/custom/path/to/jj';
      const newResolution: ToolResolutionResult = {
        resolved: true,
        path: newPath,
        source: 'manual',
      };
      mockSetPath.mockResolvedValue(newResolution);

      await getToolPathStore().setToolPath('jj', newPath);

      expect(mockSetPath).toHaveBeenCalledWith('jj', newPath);
    });

    it('should update the status for the specified tool', async () => {
      const newPath = '/custom/path/to/jj';
      const newResolution: ToolResolutionResult = {
        resolved: true,
        path: newPath,
        source: 'manual',
      };
      mockSetPath.mockResolvedValue(newResolution);

      await getToolPathStore().setToolPath('jj', newPath);

      const store = getToolPathStore();
      const jjStatus = store.statuses.find((s) => s.definition.name === 'jj');
      expect(jjStatus?.resolution).toEqual(newResolution);
    });

    it('should support clearing path with null', async () => {
      const newResolution: ToolResolutionResult = {
        resolved: false,
        source: 'not-found',
        error: 'jj not found',
      };
      mockSetPath.mockResolvedValue(newResolution);

      await getToolPathStore().setToolPath('jj', null);

      expect(mockSetPath).toHaveBeenCalledWith('jj', null);
    });

    it('should set error on failure', async () => {
      const errorMessage = 'Failed to set path';
      mockSetPath.mockRejectedValue(new Error(errorMessage));

      await getToolPathStore().setToolPath('jj', '/some/path');

      expect(getToolPathStore().error).toBe(errorMessage);
    });
  });

  describe('resolveTool', () => {
    beforeEach(async () => {
      // Initialize with mock statuses first
      mockGetStatuses.mockResolvedValue(mockStatuses);
      await getToolPathStore().fetchStatuses();
    });

    it('should call electronAPI.toolPath.resolve with correct argument', async () => {
      const newResolution: ToolResolutionResult = {
        resolved: true,
        path: '/opt/homebrew/bin/jj',
        source: 'well-known',
      };
      mockResolve.mockResolvedValue(newResolution);

      await getToolPathStore().resolveTool('jj');

      expect(mockResolve).toHaveBeenCalledWith('jj');
    });

    it('should update the status for the specified tool after re-resolution', async () => {
      const newResolution: ToolResolutionResult = {
        resolved: true,
        path: '/opt/homebrew/bin/jj',
        source: 'well-known',
      };
      mockResolve.mockResolvedValue(newResolution);

      await getToolPathStore().resolveTool('jj');

      const store = getToolPathStore();
      const jjStatus = store.statuses.find((s) => s.definition.name === 'jj');
      expect(jjStatus?.resolution).toEqual(newResolution);
    });

    it('should set error on failure', async () => {
      const errorMessage = 'Failed to resolve tool';
      mockResolve.mockRejectedValue(new Error(errorMessage));

      await getToolPathStore().resolveTool('jj');

      expect(getToolPathStore().error).toBe(errorMessage);
    });
  });

  describe('getStatusByName', () => {
    beforeEach(async () => {
      mockGetStatuses.mockResolvedValue(mockStatuses);
      await getToolPathStore().fetchStatuses();
    });

    it('should return the status for the specified tool', () => {
      const claudeStatus = getToolPathStore().getStatusByName('claude');
      expect(claudeStatus?.definition.name).toBe('claude');
      expect(claudeStatus?.resolution.resolved).toBe(true);
    });

    it('should return undefined for unknown tool', () => {
      const unknownStatus = getToolPathStore().getStatusByName('unknown');
      expect(unknownStatus).toBeUndefined();
    });
  });

  describe('isClaudeResolved', () => {
    it('should return true when claude is resolved', async () => {
      mockGetStatuses.mockResolvedValue(mockStatuses);
      await getToolPathStore().fetchStatuses();

      expect(getToolPathStore().isClaudeResolved()).toBe(true);
    });

    it('should return false when claude is not resolved', async () => {
      const statusesWithUnresolvedClaude = mockStatuses.map((s) =>
        s.definition.name === 'claude'
          ? { ...s, resolution: { resolved: false, source: 'not-found' as const, error: 'Not found' } }
          : s
      );
      mockGetStatuses.mockResolvedValue(statusesWithUnresolvedClaude);
      await getToolPathStore().fetchStatuses();

      expect(getToolPathStore().isClaudeResolved()).toBe(false);
    });

    it('should return false when statuses are not loaded', () => {
      expect(getToolPathStore().isClaudeResolved()).toBe(false);
    });
  });

  describe('resetToolPathStore', () => {
    it('should reset all state to initial values', async () => {
      mockGetStatuses.mockResolvedValue(mockStatuses);
      await getToolPathStore().fetchStatuses();

      // Verify state was modified
      expect(getToolPathStore().statuses.length).toBeGreaterThan(0);

      // Reset
      resetToolPathStore();

      // Verify reset
      const store = getToolPathStore();
      expect(store.statuses).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });
  });
});
