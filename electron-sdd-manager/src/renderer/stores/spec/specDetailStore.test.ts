/**
 * SpecDetailStore Tests
 * TDD: Testing selected Spec detail state management
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSpecDetailStore } from './specDetailStore';
import type { SpecMetadata, SpecDetail, ArtifactInfo } from '../../types';

const mockSpec: SpecMetadata = {
  name: 'feature-a',
  path: '/project/.kiro/specs/feature-a',
  phase: 'design-generated',
  updatedAt: '2024-01-15T10:00:00Z',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: false },
    tasks: { generated: false, approved: false },
  },
};

const mockSpecJson = {
  feature_name: 'feature-a',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  language: 'ja' as const,
  phase: 'design-generated' as const,
  approvals: mockSpec.approvals,
};

describe('useSpecDetailStore', () => {
  beforeEach(() => {
    // Reset store state
    useSpecDetailStore.setState({
      selectedSpec: null,
      specDetail: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values (Req 2.1, 2.2)', () => {
      const state = useSpecDetailStore.getState();
      expect(state.selectedSpec).toBeNull();
      expect(state.specDetail).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('selectSpec (Req 2.3)', () => {
    it('should set selectedSpec and load specDetail', async () => {
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('# Requirements');
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      await useSpecDetailStore.getState().selectSpec(mockSpec);

      const state = useSpecDetailStore.getState();
      expect(state.selectedSpec).toEqual(mockSpec);
      expect(state.specDetail).toBeTruthy();
      expect(state.specDetail?.specJson).toEqual(mockSpecJson);
    });

    it('should load specJson and all artifacts (Req 2.5)', async () => {
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn()
        .mockImplementation((path: string) => {
          if (path.includes('requirements')) return Promise.resolve('# Requirements');
          if (path.includes('design')) return Promise.resolve('# Design');
          if (path.includes('tasks')) return Promise.resolve('# Tasks\n- [ ] Task 1');
          if (path.includes('research')) return Promise.reject(new Error('Not found'));
          return Promise.reject(new Error('Unknown'));
        });
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      await useSpecDetailStore.getState().selectSpec(mockSpec);

      const state = useSpecDetailStore.getState();
      expect(state.specDetail?.artifacts.requirements).toBeTruthy();
      expect(state.specDetail?.artifacts.design).toBeTruthy();
      expect(state.specDetail?.artifacts.tasks).toBeTruthy();
      expect(state.specDetail?.artifacts.research).toBeNull(); // Not found
    });

    it('should calculate taskProgress from tasks.md content (Req 2.6)', async () => {
      const tasksContent = `# Tasks
- [x] Task 1 completed
- [x] Task 2 completed
- [ ] Task 3 pending
- [ ] Task 4 pending`;

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn()
        .mockImplementation((path: string) => {
          if (path.includes('tasks')) return Promise.resolve(tasksContent);
          return Promise.reject(new Error('Not found'));
        });
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);
      window.electronAPI.syncSpecPhase = vi.fn().mockResolvedValue(undefined);

      await useSpecDetailStore.getState().selectSpec(mockSpec);

      const state = useSpecDetailStore.getState();
      expect(state.specDetail?.taskProgress).toEqual({
        total: 4,
        completed: 2,
        percentage: 50,
      });
    });

    it('should set isLoading during selection when not silent', async () => {
      let resolveSpecJson: (value: unknown) => void;
      const specJsonPromise = new Promise((resolve) => {
        resolveSpecJson = resolve;
      });

      window.electronAPI.readSpecJson = vi.fn().mockReturnValue(specJsonPromise);
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('');
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      const selectPromise = useSpecDetailStore.getState().selectSpec(mockSpec);

      // isLoading should be true during selection
      expect(useSpecDetailStore.getState().isLoading).toBe(true);

      resolveSpecJson!(mockSpecJson);
      await selectPromise;

      expect(useSpecDetailStore.getState().isLoading).toBe(false);
    });

    it('should provide silent mode option (Req 2.7)', async () => {
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('');
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      // Use a spy to capture isLoading state changes
      const isLoadingValues: boolean[] = [];
      const unsubscribe = useSpecDetailStore.subscribe((state) => {
        isLoadingValues.push(state.isLoading);
      });

      await useSpecDetailStore.getState().selectSpec(mockSpec, { silent: true });

      unsubscribe();

      // In silent mode, isLoading should never be set to true
      expect(isLoadingValues.every((v) => v === false)).toBe(true);
    });

    it('should set error state if selectSpec fails (Req 2.8)', async () => {
      window.electronAPI.readSpecJson = vi.fn().mockRejectedValue(new Error('Read error'));

      await useSpecDetailStore.getState().selectSpec(mockSpec);

      const state = useSpecDetailStore.getState();
      expect(state.error).toBe('Read error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearSelectedSpec (Req 2.4)', () => {
    it('should reset selection', async () => {
      // First select a spec
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('');
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      await useSpecDetailStore.getState().selectSpec(mockSpec);

      expect(useSpecDetailStore.getState().selectedSpec).toBeTruthy();

      // Then clear
      useSpecDetailStore.getState().clearSelectedSpec();

      const state = useSpecDetailStore.getState();
      expect(state.selectedSpec).toBeNull();
      expect(state.specDetail).toBeNull();
    });
  });

  describe('refreshSpecDetail', () => {
    it('should reload spec detail when called', async () => {
      // First select a spec
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('');
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      await useSpecDetailStore.getState().selectSpec(mockSpec);

      // Update mock to return different data
      const updatedSpecJson = { ...mockSpecJson, phase: 'tasks-generated' as const };
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(updatedSpecJson);

      await useSpecDetailStore.getState().refreshSpecDetail();

      const state = useSpecDetailStore.getState();
      expect(state.specDetail?.specJson.phase).toBe('tasks-generated');
    });

    it('should do nothing when no spec is selected', async () => {
      window.electronAPI.readSpecJson = vi.fn();

      await useSpecDetailStore.getState().refreshSpecDetail();

      expect(window.electronAPI.readSpecJson).not.toHaveBeenCalled();
    });
  });

  describe('internal setters', () => {
    it('setSpecDetail should update specDetail', () => {
      const mockDetail: SpecDetail = {
        metadata: mockSpec,
        specJson: mockSpecJson,
        artifacts: {
          requirements: null,
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      };

      useSpecDetailStore.getState().setSpecDetail(mockDetail);

      expect(useSpecDetailStore.getState().specDetail).toEqual(mockDetail);
    });

    it('setSpecJson should update only specJson in specDetail', () => {
      // First set a specDetail
      const mockDetail: SpecDetail = {
        metadata: mockSpec,
        specJson: mockSpecJson,
        artifacts: {
          requirements: { exists: true, updatedAt: null, content: '# Req' },
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      };
      useSpecDetailStore.setState({ specDetail: mockDetail });

      // Update specJson
      const updatedSpecJson = { ...mockSpecJson, phase: 'tasks-generated' as const };
      useSpecDetailStore.getState().setSpecJson(updatedSpecJson);

      const state = useSpecDetailStore.getState();
      expect(state.specDetail?.specJson.phase).toBe('tasks-generated');
      // Artifacts should be preserved
      expect(state.specDetail?.artifacts.requirements?.content).toBe('# Req');
    });

    it('setArtifact should update only the specified artifact', () => {
      // First set a specDetail
      const mockDetail: SpecDetail = {
        metadata: mockSpec,
        specJson: mockSpecJson,
        artifacts: {
          requirements: { exists: true, updatedAt: null, content: '# Req' },
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      };
      useSpecDetailStore.setState({ specDetail: mockDetail });

      // Update design artifact
      const designInfo: ArtifactInfo = { exists: true, updatedAt: null, content: '# Design' };
      useSpecDetailStore.getState().setArtifact('design', designInfo);

      const state = useSpecDetailStore.getState();
      expect(state.specDetail?.artifacts.design?.content).toBe('# Design');
      // Other artifacts should be preserved
      expect(state.specDetail?.artifacts.requirements?.content).toBe('# Req');
    });

    it('setTaskProgress should update taskProgress', () => {
      // First set a specDetail
      const mockDetail: SpecDetail = {
        metadata: mockSpec,
        specJson: mockSpecJson,
        artifacts: {
          requirements: null,
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      };
      useSpecDetailStore.setState({ specDetail: mockDetail });

      useSpecDetailStore.getState().setTaskProgress({ total: 5, completed: 3, percentage: 60 });

      const state = useSpecDetailStore.getState();
      expect(state.specDetail?.taskProgress).toEqual({ total: 5, completed: 3, percentage: 60 });
    });
  });
});
