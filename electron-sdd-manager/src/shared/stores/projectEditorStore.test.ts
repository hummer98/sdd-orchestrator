/**
 * projectEditorStore Tests
 *
 * TDD: Tests written first for project-config-editor Task 1.2
 * Requirements: 4.1, 4.4, 5.2
 *
 * Test cases:
 * - Initial state
 * - loadFile action
 * - setContent action and dirty state
 * - save action
 * - handleExternalChange action
 * - clearEditor action
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the store and test utilities (will be created)
import {
  useProjectEditorStore,
  resetProjectEditorStore,
  getProjectEditorStore,
} from './projectEditorStore';

import type { ApiClient, Result, ApiError } from '../api/types';

// Mock ApiClient for testing
function createMockApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getSpecs: vi.fn(),
    getSpecDetail: vi.fn(),
    executePhase: vi.fn(),
    updateApproval: vi.fn(),
    getBugs: vi.fn(),
    getBugDetail: vi.fn(),
    executeBugPhase: vi.fn(),
    getAgents: vi.fn(),
    stopAgent: vi.fn(),
    resumeAgent: vi.fn(),
    sendAgentInput: vi.fn(),
    getAgentLogs: vi.fn(),
    executeProjectCommand: vi.fn(),
    executeDocumentReview: vi.fn(),
    executeInspection: vi.fn(),
    startAutoExecution: vi.fn(),
    stopAutoExecution: vi.fn(),
    getAutoExecutionStatus: vi.fn(),
    saveFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onSpecsUpdated: vi.fn().mockReturnValue(() => {}),
    onBugsUpdated: vi.fn().mockReturnValue(() => {}),
    onAgentOutput: vi.fn().mockReturnValue(() => {}),
    onAgentStatusChange: vi.fn().mockReturnValue(() => {}),
    onAgentLog: vi.fn().mockReturnValue(() => {}),
    onAutoExecutionStatusChanged: vi.fn().mockReturnValue(() => {}),
    startBugsWatcher: vi.fn(),
    stopBugsWatcher: vi.fn(),
    onBugsChanged: vi.fn().mockReturnValue(() => {}),
    getGitStatus: vi.fn(),
    getGitDiff: vi.fn(),
    startWatching: vi.fn(),
    stopWatching: vi.fn(),
    // Project file operations (will be added)
    readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: '# Test Content' }),
    writeProjectFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    ...overrides,
  } as unknown as ApiClient;
}

describe('projectEditorStore', () => {
  beforeEach(() => {
    resetProjectEditorStore();
  });

  describe('initial state', () => {
    it('should have null currentFilePath', () => {
      const state = getProjectEditorStore();
      expect(state.currentFilePath).toBeNull();
    });

    it('should have null currentFileName', () => {
      const state = getProjectEditorStore();
      expect(state.currentFileName).toBeNull();
    });

    it('should have empty content', () => {
      const state = getProjectEditorStore();
      expect(state.content).toBe('');
    });

    it('should have empty originalContent', () => {
      const state = getProjectEditorStore();
      expect(state.originalContent).toBe('');
    });

    it('should not be dirty', () => {
      const state = getProjectEditorStore();
      expect(state.isDirty).toBe(false);
    });

    it('should not be saving', () => {
      const state = getProjectEditorStore();
      expect(state.isSaving).toBe(false);
    });

    it('should have no error', () => {
      const state = getProjectEditorStore();
      expect(state.error).toBeNull();
    });

    // project-editor-dark-mode: Requirement 2.2 - デフォルト表示モードをpreviewに変更
    it('should be in preview mode', () => {
      const state = getProjectEditorStore();
      expect(state.mode).toBe('preview');
    });

    it('should not have external change detected', () => {
      const state = getProjectEditorStore();
      expect(state.externalChangeDetected).toBe(false);
    });
  });

  describe('loadFile action', () => {
    it('should set currentFilePath and currentFileName', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: '# Test' }),
      });

      await getProjectEditorStore().loadFile(
        mockApiClient,
        '/path/to/CLAUDE.md',
        'CLAUDE.md'
      );

      const state = getProjectEditorStore();
      expect(state.currentFilePath).toBe('/path/to/CLAUDE.md');
      expect(state.currentFileName).toBe('CLAUDE.md');
    });

    it('should set content from file', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: '# Hello World' }),
      });

      await getProjectEditorStore().loadFile(
        mockApiClient,
        '/path/to/CLAUDE.md',
        'CLAUDE.md'
      );

      const state = getProjectEditorStore();
      expect(state.content).toBe('# Hello World');
      expect(state.originalContent).toBe('# Hello World');
    });

    it('should reset dirty state after loading', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: '# Test' }),
      });

      // First, make it dirty
      getProjectEditorStore().setContent('dirty content');
      expect(getProjectEditorStore().isDirty).toBe(true);

      // Then load a file
      await getProjectEditorStore().loadFile(
        mockApiClient,
        '/path/to/CLAUDE.md',
        'CLAUDE.md'
      );

      const state = getProjectEditorStore();
      expect(state.isDirty).toBe(false);
    });

    it('should clear external change flag after loading', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: '# Test' }),
      });

      // Set external change flag
      useProjectEditorStore.setState({ externalChangeDetected: true });

      await getProjectEditorStore().loadFile(
        mockApiClient,
        '/path/to/CLAUDE.md',
        'CLAUDE.md'
      );

      const state = getProjectEditorStore();
      expect(state.externalChangeDetected).toBe(false);
    });

    it('should set error on read failure', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'READ_ERROR', message: 'File not found' },
        }),
      });

      await getProjectEditorStore().loadFile(
        mockApiClient,
        '/path/to/missing.md',
        'missing.md'
      );

      const state = getProjectEditorStore();
      expect(state.error).toBe('File not found');
      expect(state.content).toBe('');
    });
  });

  describe('setContent action', () => {
    it('should update content', () => {
      getProjectEditorStore().setContent('new content');

      const state = getProjectEditorStore();
      expect(state.content).toBe('new content');
    });

    it('should set isDirty when content differs from original', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('modified');

      const state = getProjectEditorStore();
      expect(state.isDirty).toBe(true);
    });

    it('should clear isDirty when content matches original', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('modified');
      expect(getProjectEditorStore().isDirty).toBe(true);

      getProjectEditorStore().setContent('original');
      expect(getProjectEditorStore().isDirty).toBe(false);
    });
  });

  describe('save action', () => {
    it('should call writeProjectFile with current content', async () => {
      const writeProjectFile = vi.fn().mockResolvedValue({ ok: true, value: undefined });
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
        writeProjectFile,
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('modified content');
      await getProjectEditorStore().save(mockApiClient);

      expect(writeProjectFile).toHaveBeenCalledWith('/path/to/file.md', 'modified content');
    });

    it('should set isSaving during save operation', async () => {
      let resolveWrite: () => void = () => {};
      const writePromise = new Promise<Result<void, ApiError>>((resolve) => {
        resolveWrite = () => resolve({ ok: true, value: undefined });
      });

      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
        writeProjectFile: vi.fn().mockReturnValue(writePromise),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('modified');

      const savePromise = getProjectEditorStore().save(mockApiClient);
      expect(getProjectEditorStore().isSaving).toBe(true);

      resolveWrite();
      await savePromise;

      expect(getProjectEditorStore().isSaving).toBe(false);
    });

    it('should clear isDirty after successful save', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
        writeProjectFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('modified');
      expect(getProjectEditorStore().isDirty).toBe(true);

      await getProjectEditorStore().save(mockApiClient);
      expect(getProjectEditorStore().isDirty).toBe(false);
    });

    it('should update originalContent after successful save', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
        writeProjectFile: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('modified');
      await getProjectEditorStore().save(mockApiClient);

      const state = getProjectEditorStore();
      expect(state.originalContent).toBe('modified');
    });

    it('should set error on save failure', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
        writeProjectFile: vi.fn().mockResolvedValue({
          ok: false,
          error: { type: 'WRITE_ERROR', message: 'Permission denied' },
        }),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('modified');
      await getProjectEditorStore().save(mockApiClient);

      const state = getProjectEditorStore();
      expect(state.error).toBe('Permission denied');
      // isDirty should remain true on error
      expect(state.isDirty).toBe(true);
    });

    it('should not save if no file is loaded', async () => {
      const writeProjectFile = vi.fn();
      const mockApiClient = createMockApiClient({ writeProjectFile });

      await getProjectEditorStore().save(mockApiClient);

      expect(writeProjectFile).not.toHaveBeenCalled();
    });
  });

  // project-editor-dark-mode: mode is now 'preview' by default (Requirement 2.2)
  describe('setMode action', () => {
    it('should change mode to edit', () => {
      getProjectEditorStore().setMode('edit');

      const state = getProjectEditorStore();
      expect(state.mode).toBe('edit');
    });

    it('should change mode back to preview', () => {
      getProjectEditorStore().setMode('edit');
      getProjectEditorStore().setMode('preview');

      const state = getProjectEditorStore();
      expect(state.mode).toBe('preview');
    });
  });

  describe('handleExternalChange action', () => {
    it('should reload file when reload=true', async () => {
      const readProjectFile = vi.fn()
        .mockResolvedValueOnce({ ok: true, value: 'original' })
        .mockResolvedValueOnce({ ok: true, value: 'updated externally' });
      const mockApiClient = createMockApiClient({ readProjectFile });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      useProjectEditorStore.setState({ externalChangeDetected: true });

      await getProjectEditorStore().handleExternalChange(mockApiClient, true);

      const state = getProjectEditorStore();
      expect(state.content).toBe('updated externally');
      expect(state.externalChangeDetected).toBe(false);
    });

    it('should clear external change flag when reload=false (ignore)', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      useProjectEditorStore.setState({ externalChangeDetected: true });

      await getProjectEditorStore().handleExternalChange(mockApiClient, false);

      const state = getProjectEditorStore();
      // Content should remain unchanged
      expect(state.content).toBe('original');
      expect(state.externalChangeDetected).toBe(false);
    });

    it('should preserve dirty content when ignoring external change', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'original' }),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('my edits');
      useProjectEditorStore.setState({ externalChangeDetected: true });

      await getProjectEditorStore().handleExternalChange(mockApiClient, false);

      const state = getProjectEditorStore();
      expect(state.content).toBe('my edits');
      expect(state.isDirty).toBe(true);
    });
  });

  // project-editor-dark-mode: mode is now 'preview' by default (Requirement 2.2)
  describe('clearEditor action', () => {
    it('should reset all editor state', async () => {
      const mockApiClient = createMockApiClient({
        readProjectFile: vi.fn().mockResolvedValue({ ok: true, value: 'content' }),
      });

      await getProjectEditorStore().loadFile(mockApiClient, '/path/to/file.md', 'file.md');
      getProjectEditorStore().setContent('modified');
      getProjectEditorStore().setMode('edit');

      getProjectEditorStore().clearEditor();

      const state = getProjectEditorStore();
      expect(state.currentFilePath).toBeNull();
      expect(state.currentFileName).toBeNull();
      expect(state.content).toBe('');
      expect(state.originalContent).toBe('');
      expect(state.isDirty).toBe(false);
      expect(state.mode).toBe('preview');
      expect(state.externalChangeDetected).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setExternalChangeDetected action', () => {
    it('should set externalChangeDetected flag', () => {
      getProjectEditorStore().setExternalChangeDetected(true);

      expect(getProjectEditorStore().externalChangeDetected).toBe(true);
    });

    it('should clear externalChangeDetected flag', () => {
      useProjectEditorStore.setState({ externalChangeDetected: true });
      getProjectEditorStore().setExternalChangeDetected(false);

      expect(getProjectEditorStore().externalChangeDetected).toBe(false);
    });
  });
});
