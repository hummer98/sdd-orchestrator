/**
 * Version Status Store
 * Manages commandset version status for projects
 * Requirements (commandset-version-detection): 3.1
 */

import { create } from 'zustand';
import type { VersionCheckResult } from '../types';

/**
 * Version status state for a single project
 */
interface ProjectVersionStatus {
  result: VersionCheckResult | null;
  isChecking: boolean;
  lastCheckedAt: string | null;
}

/**
 * Version status store state
 */
interface VersionStatusState {
  /** Map of project path to version status */
  projectStatuses: Map<string, ProjectVersionStatus>;
  /** Global checking flag */
  isChecking: boolean;
}

/**
 * Version status store actions
 */
interface VersionStatusActions {
  /** Check version status for a project */
  checkProjectVersions: (projectPath: string) => Promise<VersionCheckResult | null>;
  /** Clear version status for a project */
  clearVersionStatus: (projectPath: string) => void;
  /** Clear all version statuses */
  clearAllVersionStatuses: () => void;
  /** Get version status for a project */
  getVersionStatus: (projectPath: string) => ProjectVersionStatus | undefined;
  /** Check if any project needs update */
  hasAnyUpdateRequired: (projectPath: string) => boolean;
}

type VersionStatusStore = VersionStatusState & VersionStatusActions;

/**
 * Initial project version status
 */
const createInitialProjectStatus = (): ProjectVersionStatus => ({
  result: null,
  isChecking: false,
  lastCheckedAt: null,
});

export const useVersionStatusStore = create<VersionStatusStore>((set, get) => ({
  // Initial state
  projectStatuses: new Map(),
  isChecking: false,

  // Actions
  checkProjectVersions: async (projectPath: string): Promise<VersionCheckResult | null> => {
    // Set checking state
    set((state) => {
      const newStatuses = new Map(state.projectStatuses);
      const existing = newStatuses.get(projectPath) || createInitialProjectStatus();
      newStatuses.set(projectPath, { ...existing, isChecking: true });
      return { projectStatuses: newStatuses, isChecking: true };
    });

    try {
      const result = await window.electronAPI.checkCommandsetVersions(projectPath);

      set((state) => {
        const newStatuses = new Map(state.projectStatuses);
        newStatuses.set(projectPath, {
          result,
          isChecking: false,
          lastCheckedAt: new Date().toISOString(),
        });
        return { projectStatuses: newStatuses, isChecking: false };
      });

      return result;
    } catch (error) {
      console.error('[versionStatusStore] Failed to check versions:', error);

      set((state) => {
        const newStatuses = new Map(state.projectStatuses);
        const existing = newStatuses.get(projectPath) || createInitialProjectStatus();
        newStatuses.set(projectPath, { ...existing, isChecking: false });
        return { projectStatuses: newStatuses, isChecking: false };
      });

      return null;
    }
  },

  clearVersionStatus: (projectPath: string) => {
    set((state) => {
      const newStatuses = new Map(state.projectStatuses);
      newStatuses.delete(projectPath);
      return { projectStatuses: newStatuses };
    });
  },

  clearAllVersionStatuses: () => {
    set({ projectStatuses: new Map() });
  },

  getVersionStatus: (projectPath: string) => {
    return get().projectStatuses.get(projectPath);
  },

  hasAnyUpdateRequired: (projectPath: string) => {
    const status = get().projectStatuses.get(projectPath);
    return status?.result?.anyUpdateRequired ?? false;
  },
}));
