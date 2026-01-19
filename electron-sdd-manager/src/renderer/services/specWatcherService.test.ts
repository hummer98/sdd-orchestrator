/**
 * SpecWatcherService Tests
 * TDD: Testing file watcher service for spec changes
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpecWatcherService } from './specWatcherService';
import type { SpecSyncService } from './specSyncService';

const mockSpec = {
  name: 'feature-a',
  path: '/project/.kiro/specs/feature-a',
  phase: 'design-generated' as const,
  updatedAt: '2024-01-15T10:00:00Z',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: false },
    tasks: { generated: false, approved: false },
  },
};

describe('SpecWatcherService', () => {
  let service: SpecWatcherService;
  let mockSyncService: {
    updateSpecJson: ReturnType<typeof vi.fn>;
    updateArtifact: ReturnType<typeof vi.fn>;
    syncDocumentReviewState: ReturnType<typeof vi.fn>;
    syncInspectionState: ReturnType<typeof vi.fn>;
    syncTaskProgress: ReturnType<typeof vi.fn>;
  };
  let mockGetSelectedSpec: ReturnType<typeof vi.fn>;
  let mockUpdateSpecMetadata: ReturnType<typeof vi.fn>;
  let mockReloadSpecs: ReturnType<typeof vi.fn>;
  let onSpecsChangedCallback: ((event: { specId: string; path: string; type?: string }) => void) | null = null;
  let cleanupFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSyncService = {
      updateSpecJson: vi.fn().mockResolvedValue(undefined),
      updateArtifact: vi.fn().mockResolvedValue(undefined),
      syncDocumentReviewState: vi.fn().mockResolvedValue(undefined),
      syncInspectionState: vi.fn().mockResolvedValue(undefined),
      syncTaskProgress: vi.fn().mockResolvedValue(undefined),
    };
    mockGetSelectedSpec = vi.fn().mockReturnValue(mockSpec);
    mockUpdateSpecMetadata = vi.fn().mockResolvedValue(undefined);
    mockReloadSpecs = vi.fn().mockResolvedValue(undefined);
    cleanupFn = vi.fn();
    onSpecsChangedCallback = null;

    window.electronAPI.onSpecsChanged = vi.fn().mockImplementation((callback) => {
      onSpecsChangedCallback = callback;
      return cleanupFn;
    });
    window.electronAPI.stopSpecsWatcher = vi.fn().mockResolvedValue(undefined);

    service = new SpecWatcherService();
    vi.clearAllMocks();
  });

  describe('init (Req 4.1)', () => {
    it('should inject dependencies successfully', () => {
      service.init({
        syncService: mockSyncService as unknown as SpecSyncService,
        getSelectedSpec: mockGetSelectedSpec,
        updateSpecMetadata: mockUpdateSpecMetadata,
        reloadSpecs: mockReloadSpecs,
      });

      expect(true).toBe(true);
    });
  });

  describe('isWatching state (Req 4.10)', () => {
    it('should be false initially', () => {
      expect(service.isWatching).toBe(false);
    });
  });

  describe('startWatching (Req 4.2)', () => {
    beforeEach(() => {
      service.init({
        syncService: mockSyncService as unknown as SpecSyncService,
        getSelectedSpec: mockGetSelectedSpec,
        updateSpecMetadata: mockUpdateSpecMetadata,
        reloadSpecs: mockReloadSpecs,
      });
    });

    it('should register onSpecsChanged listener', async () => {
      await service.startWatching();

      expect(window.electronAPI.onSpecsChanged).toHaveBeenCalled();
      expect(onSpecsChangedCallback).toBeTruthy();
      expect(service.isWatching).toBe(true);
    });

    it('should clean up existing listener before registering new one', async () => {
      await service.startWatching();
      const firstCleanupFn = cleanupFn;

      cleanupFn = vi.fn();
      await service.startWatching();

      expect(firstCleanupFn).toHaveBeenCalled();
    });
  });

  describe('stopWatching (Req 4.3)', () => {
    beforeEach(() => {
      service.init({
        syncService: mockSyncService as unknown as SpecSyncService,
        getSelectedSpec: mockGetSelectedSpec,
        updateSpecMetadata: mockUpdateSpecMetadata,
        reloadSpecs: mockReloadSpecs,
      });
    });

    it('should call cleanup function and stop watcher', async () => {
      await service.startWatching();
      await service.stopWatching();

      expect(cleanupFn).toHaveBeenCalled();
      expect(window.electronAPI.stopSpecsWatcher).toHaveBeenCalled();
      expect(service.isWatching).toBe(false);
    });

    it('should handle stopWatching when not watching', async () => {
      await service.stopWatching();

      expect(service.isWatching).toBe(false);
      // Should not throw
    });
  });

  describe('file change handling', () => {
    beforeEach(async () => {
      service.init({
        syncService: mockSyncService as unknown as SpecSyncService,
        getSelectedSpec: mockGetSelectedSpec,
        updateSpecMetadata: mockUpdateSpecMetadata,
        reloadSpecs: mockReloadSpecs,
      });
      await service.startWatching();
    });

    describe('spec.json changes (Req 4.4)', () => {
      it('should call syncService.updateSpecJson for selected spec', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/spec.json',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.updateSpecJson).toHaveBeenCalled();
      });
    });

    describe('artifact changes (Req 4.5)', () => {
      it('should call syncService.updateArtifact for requirements.md', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/requirements.md',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.updateArtifact).toHaveBeenCalledWith('requirements');
      });

      it('should call syncService.updateArtifact for design.md', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/design.md',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.updateArtifact).toHaveBeenCalledWith('design');
      });

      it('should call syncService.updateArtifact for research.md', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/research.md',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.updateArtifact).toHaveBeenCalledWith('research');
      });
    });

    describe('tasks.md changes (Req 4.6)', () => {
      it('should call both updateArtifact and syncTaskProgress', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/tasks.md',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.updateArtifact).toHaveBeenCalledWith('tasks');
        expect(mockSyncService.syncTaskProgress).toHaveBeenCalled();
      });
    });

    describe('document-review-*.md changes (Req 4.7)', () => {
      it('should call syncService.syncDocumentReviewState', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/document-review-requirements.md',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.syncDocumentReviewState).toHaveBeenCalled();
      });
    });

    describe('inspection-*.md changes (Req 4.8)', () => {
      it('should call syncService.syncInspectionState', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/inspection-1.md',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.syncInspectionState).toHaveBeenCalled();
      });
    });

    describe('non-selected spec changes (Req 4.9)', () => {
      it('should only call updateSpecMetadata for non-selected spec', async () => {
        mockGetSelectedSpec.mockReturnValue(mockSpec);

        onSpecsChangedCallback?.({
          specId: 'feature-b', // Different from selected 'feature-a'
          path: '/project/.kiro/specs/feature-b/spec.json',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockUpdateSpecMetadata).toHaveBeenCalledWith('feature-b');
        expect(mockSyncService.updateSpecJson).not.toHaveBeenCalled();
        expect(mockSyncService.updateArtifact).not.toHaveBeenCalled();
      });
    });

    describe('unknown file types', () => {
      it('should call updateSpecJson as fallback for unknown files', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/unknown-file.txt',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.updateSpecJson).toHaveBeenCalled();
      });
    });

    describe('empty specId', () => {
      it('should ignore events with empty specId', async () => {
        onSpecsChangedCallback?.({
          specId: '',
          path: '/project/.kiro/specs/unknown/spec.json',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockSyncService.updateSpecJson).not.toHaveBeenCalled();
        expect(mockSyncService.updateArtifact).not.toHaveBeenCalled();
        expect(mockUpdateSpecMetadata).not.toHaveBeenCalled();
      });
    });

    describe('no selected spec', () => {
      it('should only call updateSpecMetadata when no spec is selected', async () => {
        mockGetSelectedSpec.mockReturnValue(null);

        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/spec.json',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockUpdateSpecMetadata).toHaveBeenCalledWith('feature-a');
        expect(mockSyncService.updateSpecJson).not.toHaveBeenCalled();
      });
    });

    // spec-worktree-early-creation: Tests for addDir/unlinkDir events
    describe('directory add/remove events', () => {
      it('should call reloadSpecs on addDir event', async () => {
        onSpecsChangedCallback?.({
          specId: 'new-feature',
          path: '/project/.kiro/specs/new-feature',
          type: 'addDir',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockReloadSpecs).toHaveBeenCalled();
        expect(mockSyncService.updateSpecJson).not.toHaveBeenCalled();
        expect(mockUpdateSpecMetadata).not.toHaveBeenCalled();
      });

      it('should call reloadSpecs on unlinkDir event', async () => {
        onSpecsChangedCallback?.({
          specId: 'deleted-feature',
          path: '/project/.kiro/specs/deleted-feature',
          type: 'unlinkDir',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockReloadSpecs).toHaveBeenCalled();
        expect(mockSyncService.updateSpecJson).not.toHaveBeenCalled();
        expect(mockUpdateSpecMetadata).not.toHaveBeenCalled();
      });

      it('should not call reloadSpecs for other event types', async () => {
        onSpecsChangedCallback?.({
          specId: 'feature-a',
          path: '/project/.kiro/specs/feature-a/spec.json',
          type: 'change',
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockReloadSpecs).not.toHaveBeenCalled();
      });
    });
  });
});
