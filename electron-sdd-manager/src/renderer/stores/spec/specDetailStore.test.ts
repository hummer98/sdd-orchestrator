/**
 * SpecDetailStore Tests
 * TDD: Testing selected Spec detail state management
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSpecDetailStore, getResolvedScheme } from './specDetailStore';
import { useEditorStore } from '../editorStore';
import type { SpecMetadata, SpecDetail, ArtifactInfo } from '../../types';
import { DEFAULT_REVIEWER_SCHEME } from '@shared/registry';

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

    it('should clear specDetail immediately when switching specs (Bug fix: spec-item-flash-wrong-content)', async () => {
      // Setup: First select spec-a and complete loading
      const specA: SpecMetadata = {
        name: 'spec-a',
        path: '/project/.kiro/specs/spec-a',
        phase: 'requirements-generated',
        updatedAt: '2024-01-15T10:00:00Z',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };

      const specB: SpecMetadata = {
        name: 'spec-b',
        path: '/project/.kiro/specs/spec-b',
        phase: 'design-generated',
        updatedAt: '2024-01-16T10:00:00Z',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: false, approved: false },
        },
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue({
        ...mockSpecJson,
        feature_name: 'spec-a',
      });
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('# Spec A Content');
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      await useSpecDetailStore.getState().selectSpec(specA);

      // Verify spec-a is loaded
      expect(useSpecDetailStore.getState().specDetail?.metadata.name).toBe('spec-a');
      expect(useSpecDetailStore.getState().specDetail?.artifacts.requirements).toBeTruthy();

      // Now simulate slow loading for spec-b
      let resolveSpecJson: (value: unknown) => void;
      const specJsonPromise = new Promise((resolve) => {
        resolveSpecJson = resolve;
      });
      window.electronAPI.readSpecJson = vi.fn().mockReturnValue(specJsonPromise);

      // Start loading spec-b (don't await yet)
      const selectPromise = useSpecDetailStore.getState().selectSpec(specB);

      // specDetail should be cleared immediately to prevent showing spec-a's artifacts
      expect(useSpecDetailStore.getState().selectedSpec?.name).toBe('spec-b');
      expect(useSpecDetailStore.getState().specDetail).toBeNull();
      expect(useSpecDetailStore.getState().isLoading).toBe(true);

      // Complete loading
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('# Spec B Content');
      resolveSpecJson!({ ...mockSpecJson, feature_name: 'spec-b' });
      await selectPromise;

      // Now spec-b should be fully loaded
      expect(useSpecDetailStore.getState().specDetail?.metadata.name).toBe('spec-b');
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

    it('should also clear editor content (Bug fix: spec-item-flash-wrong-content)', async () => {
      // Setup: select a spec and set editor content
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('# Requirements');
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      await useSpecDetailStore.getState().selectSpec(mockSpec);

      // Simulate editor having content
      useEditorStore.setState({
        content: '# Old content',
        originalContent: '# Old content',
        currentPath: '/project/.kiro/specs/feature-a/requirements.md',
      });

      // Clear selected spec
      useSpecDetailStore.getState().clearSelectedSpec();

      // Editor content should be cleared
      const editorState = useEditorStore.getState();
      expect(editorState.content).toBe('');
      expect(editorState.originalContent).toBe('');
      expect(editorState.currentPath).toBeNull();
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

  // ============================================================
  // debatex-document-review Task 6.4: getResolvedScheme unit tests
  // Requirements: 3.2.1, 3.2.2, 3.2.3, 3.2.4
  // ============================================================

  describe('getResolvedScheme', () => {
    beforeEach(() => {
      // Reset store state
      useSpecDetailStore.setState({
        selectedSpec: null,
        specDetail: null,
        projectDefaultScheme: undefined,
        isLoading: false,
        error: null,
      });
    });

    it('should return DEFAULT_REVIEWER_SCHEME when no specDetail and no projectDefault (Req 3.2.4)', () => {
      // Given: No specDetail, no projectDefaultScheme
      useSpecDetailStore.setState({
        specDetail: null,
        projectDefaultScheme: undefined,
      });

      // When: getResolvedScheme is called
      const result = getResolvedScheme(useSpecDetailStore.getState());

      // Then: Should return the default scheme
      expect(result).toBe(DEFAULT_REVIEWER_SCHEME);
    });

    it('should return projectDefaultScheme when set and no specJson scheme (Req 3.2.3)', () => {
      // Given: specDetail without scheme, projectDefaultScheme = 'gemini-cli'
      const mockDetail: SpecDetail = {
        metadata: mockSpec,
        specJson: {
          ...mockSpecJson,
          // No documentReview.scheme
        },
        artifacts: {
          requirements: null,
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      };
      useSpecDetailStore.setState({
        specDetail: mockDetail,
        projectDefaultScheme: 'gemini-cli',
      });

      // When: getResolvedScheme is called
      const result = getResolvedScheme(useSpecDetailStore.getState());

      // Then: Should return projectDefaultScheme
      expect(result).toBe('gemini-cli');
    });

    it('should return specJson scheme when set (highest priority) (Req 3.2.1, 3.2.2)', () => {
      // Given: specDetail with documentReview.scheme = 'debatex', projectDefaultScheme = 'gemini-cli'
      const mockDetail: SpecDetail = {
        metadata: mockSpec,
        specJson: {
          ...mockSpecJson,
          documentReview: {
            scheme: 'debatex',
          },
        },
        artifacts: {
          requirements: null,
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      };
      useSpecDetailStore.setState({
        specDetail: mockDetail,
        projectDefaultScheme: 'gemini-cli',
      });

      // When: getResolvedScheme is called
      const result = getResolvedScheme(useSpecDetailStore.getState());

      // Then: specJson scheme takes priority
      expect(result).toBe('debatex');
    });

    it('should fall back to DEFAULT when specJson has documentReview but no scheme (Req 3.2.4)', () => {
      // Given: specDetail with documentReview but no scheme, no projectDefault
      const mockDetail: SpecDetail = {
        metadata: mockSpec,
        specJson: {
          ...mockSpecJson,
          documentReview: {
            // no scheme field
          },
        },
        artifacts: {
          requirements: null,
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      };
      useSpecDetailStore.setState({
        specDetail: mockDetail,
        projectDefaultScheme: undefined,
      });

      // When: getResolvedScheme is called
      const result = getResolvedScheme(useSpecDetailStore.getState());

      // Then: Should return the default scheme
      expect(result).toBe(DEFAULT_REVIEWER_SCHEME);
    });

    it('should use DEFAULT_REVIEWER_SCHEME when projectDefaultScheme is undefined and no specJson scheme', () => {
      // Given: specDetail without scheme, projectDefaultScheme = undefined
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
      useSpecDetailStore.setState({
        specDetail: mockDetail,
        projectDefaultScheme: undefined,
      });

      // When: getResolvedScheme is called
      const result = getResolvedScheme(useSpecDetailStore.getState());

      // Then: Should return the default scheme
      expect(result).toBe(DEFAULT_REVIEWER_SCHEME);
    });
  });

  // ============================================================
  // worktree field preservation tests
  // Verify that worktree field is properly loaded and preserved
  // ============================================================

  describe('worktree field loading', () => {
    it('should load specJson with worktree field when present', async () => {
      const specJsonWithWorktree = {
        ...mockSpecJson,
        worktree: {
          branch: 'feature/test-feature',
          created_at: '2024-01-15T10:00:00Z',
        },
      };

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(specJsonWithWorktree);
      window.electronAPI.readArtifact = vi.fn().mockRejectedValue(new Error('Not found'));
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(false);

      await useSpecDetailStore.getState().selectSpec(mockSpec);

      const state = useSpecDetailStore.getState();
      expect(state.specDetail?.specJson.worktree).toEqual({
        branch: 'feature/test-feature',
        created_at: '2024-01-15T10:00:00Z',
      });
    });

    it('should preserve worktree field after setSpecJson', () => {
      const mockDetail: SpecDetail = {
        metadata: mockSpec,
        specJson: {
          ...mockSpecJson,
          worktree: {
            branch: 'feature/original',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
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

      // Update specJson with worktree
      const updatedSpecJson = {
        ...mockSpecJson,
        worktree: {
          branch: 'feature/updated',
          created_at: '2024-01-15T10:00:00Z',
        },
      };
      useSpecDetailStore.getState().setSpecJson(updatedSpecJson);

      const state = useSpecDetailStore.getState();
      expect(state.specDetail?.specJson.worktree).toEqual({
        branch: 'feature/updated',
        created_at: '2024-01-15T10:00:00Z',
      });
    });
  });
});
