/**
 * Spec Store
 * Manages spec list and detail state
 * Requirements: 2.1-2.6, 3.1-3.5
 */

import { create } from 'zustand';
import type { SpecMetadata, SpecDetail, SpecPhase, ArtifactInfo, TaskProgress } from '../types';

interface SpecState {
  specs: SpecMetadata[];
  selectedSpec: SpecMetadata | null;
  specDetail: SpecDetail | null;
  sortBy: 'name' | 'updatedAt' | 'phase';
  sortOrder: 'asc' | 'desc';
  statusFilter: SpecPhase | 'all';
  isLoading: boolean;
  error: string | null;
}

interface SpecActions {
  loadSpecs: (projectPath: string) => Promise<void>;
  selectSpec: (spec: SpecMetadata) => Promise<void>;
  clearSelectedSpec: () => void;
  setSortBy: (sortBy: SpecState['sortBy']) => void;
  setSortOrder: (order: SpecState['sortOrder']) => void;
  setStatusFilter: (filter: SpecState['statusFilter']) => void;
  refreshSpecs: () => Promise<void>;
  getSortedFilteredSpecs: () => SpecMetadata[];
}

type SpecStore = SpecState & SpecActions;

// Store the current project path for refresh
let currentProjectPath: string | null = null;

export const useSpecStore = create<SpecStore>((set, get) => ({
  // Initial state
  specs: [],
  selectedSpec: null,
  specDetail: null,
  sortBy: 'name',
  sortOrder: 'asc',
  statusFilter: 'all',
  isLoading: false,
  error: null,

  // Actions
  loadSpecs: async (projectPath: string) => {
    currentProjectPath = projectPath;
    set({ isLoading: true, error: null });

    try {
      // Initialize SpecManagerService on main process
      await window.electronAPI.setProjectPath(projectPath);
      const specs = await window.electronAPI.readSpecs(projectPath);
      set({ specs, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '仕様の読み込みに失敗しました',
        isLoading: false,
      });
    }
  },

  selectSpec: async (spec: SpecMetadata) => {
    set({ selectedSpec: spec, isLoading: true, error: null });

    try {
      const specJson = await window.electronAPI.readSpecJson(spec.path);

      // Get artifact info with content for tasks
      const getArtifactInfo = async (name: string): Promise<ArtifactInfo | null> => {
        try {
          const artifactPath = `${spec.path}/${name}.md`;
          const content = await window.electronAPI.readArtifact(artifactPath);
          return { exists: true, updatedAt: null, content };
        } catch {
          return null;
        }
      };

      const [requirements, design, tasks] = await Promise.all([
        getArtifactInfo('requirements'),
        getArtifactInfo('design'),
        getArtifactInfo('tasks'),
      ]);

      // Calculate task progress from tasks.md content
      // Only match tasks at line start (excluding code examples in backticks)
      let taskProgress: TaskProgress | null = null;
      if (tasks?.content) {
        const completedMatches = tasks.content.match(/^- \[x\]/gim) || [];
        const pendingMatches = tasks.content.match(/^- \[ \]/gm) || [];
        const total = completedMatches.length + pendingMatches.length;
        const completed = completedMatches.length;
        taskProgress = {
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }

      const specDetail: SpecDetail = {
        metadata: spec,
        specJson,
        artifacts: {
          requirements,
          design,
          tasks,
        },
        taskProgress,
      };

      set({ specDetail, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '仕様詳細の読み込みに失敗しました',
        isLoading: false,
      });
    }
  },

  clearSelectedSpec: () => {
    set({ selectedSpec: null, specDetail: null });
  },

  setSortBy: (sortBy: SpecState['sortBy']) => {
    set({ sortBy });
  },

  setSortOrder: (order: SpecState['sortOrder']) => {
    set({ sortOrder: order });
  },

  setStatusFilter: (filter: SpecState['statusFilter']) => {
    set({ statusFilter: filter });
  },

  refreshSpecs: async () => {
    if (currentProjectPath) {
      await get().loadSpecs(currentProjectPath);
    }
  },

  getSortedFilteredSpecs: () => {
    const { specs, sortBy, sortOrder, statusFilter } = get();

    // Filter
    let filtered = specs;
    if (statusFilter !== 'all') {
      filtered = specs.filter((spec) => spec.phase === statusFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'phase':
          comparison = a.phase.localeCompare(b.phase);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  },
}));
