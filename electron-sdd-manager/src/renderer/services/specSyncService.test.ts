/**
 * SpecSyncService Tests
 * TDD: Testing file sync service for spec store
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpecSyncService } from './specSyncService';
import type { ArtifactInfo, TaskProgress, SpecDetail } from '../types';
import type { SpecDetailState, ArtifactType } from '../stores/spec/types';

// spec-path-ssot-refactor: SpecMetadata now only contains name field
// phase, updatedAt, approvals should be obtained from SpecJson (SSOT)
const mockSpec = {
  name: 'feature-a',
};

const mockSpecJson = {
  feature_name: 'feature-a',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  language: 'ja' as const,
  phase: 'design-generated' as const,
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: false },
    tasks: { generated: false, approved: false },
  },
};

const mockSpecDetail: SpecDetail = {
  metadata: mockSpec,
  specJson: mockSpecJson,
  artifacts: {
    requirements: { exists: true, updatedAt: null, content: '# Requirements' },
    design: { exists: true, updatedAt: null, content: '# Design' },
    tasks: { exists: true, updatedAt: null, content: '# Tasks\n- [ ] Task 1' },
    research: null,
    inspection: null,
  },
  taskProgress: { total: 1, completed: 0, percentage: 0 },
};

describe('SpecSyncService', () => {
  let service: SpecSyncService;
  let mockSetSpecJson: ReturnType<typeof vi.fn>;
  let mockSetArtifact: ReturnType<typeof vi.fn>;
  let mockSetTaskProgress: ReturnType<typeof vi.fn>;
  let mockUpdateSpecMetadata: ReturnType<typeof vi.fn>;
  let mockEditorSyncCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetSpecJson = vi.fn();
    mockSetArtifact = vi.fn();
    mockSetTaskProgress = vi.fn();
    mockUpdateSpecMetadata = vi.fn().mockResolvedValue(undefined);
    mockEditorSyncCallback = vi.fn().mockResolvedValue(undefined);

    service = new SpecSyncService();
    vi.clearAllMocks();
  });

  describe('init (Req 3.1)', () => {
    it('should inject callbacks successfully', () => {
      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      // No error means success
      expect(true).toBe(true);
    });

    it('should allow multiple init calls (for dependency re-injection)', () => {
      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: vi.fn(),
        setArtifact: vi.fn(),
        setTaskProgress: vi.fn(),
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: vi.fn(),
        editorSyncCallback: vi.fn(),
      });

      // No error means success
      expect(true).toBe(true);
    });
  });

  describe('updateSpecJson (Req 3.2)', () => {
    beforeEach(() => {
      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });
    });

    it('should read spec.json and update state', async () => {
      const updatedSpecJson = { ...mockSpecJson, phase: 'tasks-generated' as const };
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(updatedSpecJson);

      await service.updateSpecJson();

      // spec-path-ssot-refactor: readSpecJson now takes specName instead of path
      expect(window.electronAPI.readSpecJson).toHaveBeenCalledWith(mockSpec.name);
      expect(mockSetSpecJson).toHaveBeenCalledWith(updatedSpecJson);
    });

    it('should do nothing when no spec is selected', async () => {
      service.init({
        getSelectedSpec: () => null,
        getSpecDetail: () => null,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      window.electronAPI.readSpecJson = vi.fn();

      await service.updateSpecJson();

      expect(window.electronAPI.readSpecJson).not.toHaveBeenCalled();
      expect(mockSetSpecJson).not.toHaveBeenCalled();
    });

    it('should also update spec metadata in list', async () => {
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(mockSpecJson);

      await service.updateSpecJson();

      expect(mockUpdateSpecMetadata).toHaveBeenCalledWith(mockSpec.name);
    });

    // Bug fix: inspection-state-data-model - Use new InspectionState structure
    it('should load inspection artifact when spec.json has inspection field', async () => {
      const specJsonWithInspection = {
        ...mockSpecJson,
        inspection: {
          rounds: [
            { number: 1, result: 'go' as const, inspectedAt: '2025-01-01T00:00:00Z' },
          ],
        },
      };
      const inspectionContent = '# Inspection Report\n\nGO';

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(specJsonWithInspection);
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue(inspectionContent);

      await service.updateSpecJson();

      // Artifact type is now 'inspection-1' based on report file name
      expect(mockSetArtifact).toHaveBeenCalledWith('inspection-1', {
        exists: true,
        updatedAt: null,
        content: inspectionContent,
      });
    });
  });

  describe('updateArtifact (Req 3.3)', () => {
    beforeEach(() => {
      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });
    });

    it('should read artifact and update state', async () => {
      const newContent = '# Updated Requirements';
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue(newContent);

      await service.updateArtifact('requirements');

      // spec-path-ssot-refactor: readArtifact now takes (specName, filename) instead of full path
      expect(window.electronAPI.readArtifact).toHaveBeenCalledWith(
        mockSpec.name,
        'requirements.md'
      );
      expect(mockSetArtifact).toHaveBeenCalledWith('requirements', {
        exists: true,
        updatedAt: null,
        content: newContent,
      });
    });

    it('should set artifact to null when file not found', async () => {
      window.electronAPI.readArtifact = vi.fn().mockRejectedValue(new Error('Not found'));

      await service.updateArtifact('research');

      expect(mockSetArtifact).toHaveBeenCalledWith('research', null);
    });

    it('should recalculate taskProgress when tasks artifact changes (Req 3.6)', async () => {
      const tasksContent = `# Tasks
- [x] Task 1 completed
- [x] Task 2 completed
- [ ] Task 3 pending`;

      window.electronAPI.readArtifact = vi.fn().mockResolvedValue(tasksContent);

      await service.updateArtifact('tasks');

      expect(mockSetTaskProgress).toHaveBeenCalledWith({
        total: 3,
        completed: 2,
        percentage: 67,
      });
    });

    it('should do nothing when no spec is selected', async () => {
      service.init({
        getSelectedSpec: () => null,
        getSpecDetail: () => null,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      window.electronAPI.readArtifact = vi.fn();

      await service.updateArtifact('requirements');

      expect(window.electronAPI.readArtifact).not.toHaveBeenCalled();
      expect(mockSetArtifact).not.toHaveBeenCalled();
    });
  });

  describe('syncDocumentReviewState (Req 3.4)', () => {
    beforeEach(() => {
      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });
    });

    it('should sync document review and update specJson', async () => {
      const updatedSpecJson = {
        ...mockSpecJson,
        documentReview: { status: 'completed', currentRound: 1 },
      };
      window.electronAPI.syncDocumentReview = vi.fn().mockResolvedValue(true);
      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(updatedSpecJson);

      await service.syncDocumentReviewState();

      // spec-path-ssot-refactor: syncDocumentReview and readSpecJson now take specName
      expect(window.electronAPI.syncDocumentReview).toHaveBeenCalledWith(mockSpec.name);
      expect(window.electronAPI.readSpecJson).toHaveBeenCalledWith(mockSpec.name);
      expect(mockSetSpecJson).toHaveBeenCalledWith(updatedSpecJson);
    });

    it('should do nothing when no spec is selected', async () => {
      service.init({
        getSelectedSpec: () => null,
        getSpecDetail: () => null,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      window.electronAPI.syncDocumentReview = vi.fn();

      await service.syncDocumentReviewState();

      expect(window.electronAPI.syncDocumentReview).not.toHaveBeenCalled();
    });
  });

  describe('syncInspectionState (Req 3.5)', () => {
    beforeEach(() => {
      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });
    });

    it('should read spec.json and load inspection artifact', async () => {
      // Bug fix: inspection-state-data-model - Use new InspectionState structure
      const specJsonWithInspection = {
        ...mockSpecJson,
        inspection: {
          rounds: [
            { number: 1, result: 'go' as const, inspectedAt: '2025-01-01T00:00:00Z' },
          ],
        },
      };
      const inspectionContent = '# Inspection Report\n\nGO';

      window.electronAPI.readSpecJson = vi.fn().mockResolvedValue(specJsonWithInspection);
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue(inspectionContent);

      await service.syncInspectionState();

      expect(mockSetSpecJson).toHaveBeenCalledWith(specJsonWithInspection);
      // Artifact type is now 'inspection-1' based on report file name
      expect(mockSetArtifact).toHaveBeenCalledWith('inspection-1', {
        exists: true,
        updatedAt: null,
        content: inspectionContent,
      });
    });

    it('should do nothing when no spec is selected', async () => {
      service.init({
        getSelectedSpec: () => null,
        getSpecDetail: () => null,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      window.electronAPI.readSpecJson = vi.fn();

      await service.syncInspectionState();

      expect(window.electronAPI.readSpecJson).not.toHaveBeenCalled();
    });
  });

  describe('syncTaskProgress (Req 3.7)', () => {
    beforeEach(() => {
      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });
    });

    it('should calculate task progress from current tasks content', async () => {
      const tasksContent = `# Tasks
- [x] Task 1
- [x] Task 2
- [ ] Task 3`;

      const detailWithTasks: SpecDetail = {
        ...mockSpecDetail,
        artifacts: {
          ...mockSpecDetail.artifacts,
          tasks: { exists: true, updatedAt: null, content: tasksContent },
        },
      };

      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => detailWithTasks,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      await service.syncTaskProgress();

      expect(mockSetTaskProgress).toHaveBeenCalledWith({
        total: 3,
        completed: 2,
        percentage: 67,
      });
    });

    // Phase update is handled by Main process (specsWatcherService), not Renderer
    it('should NOT update phase even when all tasks are complete', async () => {
      const tasksContent = `# Tasks
- [x] Task 1
- [x] Task 2
- [x] Task 3`;

      const detailWithTasks: SpecDetail = {
        ...mockSpecDetail,
        specJson: { ...mockSpecJson, phase: 'tasks-generated' },
        artifacts: {
          ...mockSpecDetail.artifacts,
          tasks: { exists: true, updatedAt: null, content: tasksContent },
        },
      };

      window.electronAPI.syncSpecPhase = vi.fn();

      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => detailWithTasks,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      await service.syncTaskProgress();

      // Renderer should NOT call syncSpecPhase - this is Main process responsibility
      expect(window.electronAPI.syncSpecPhase).not.toHaveBeenCalled();
      // setSpecJson should NOT be called for phase updates
      expect(mockSetSpecJson).not.toHaveBeenCalled();
      // But taskProgress should still be calculated
      expect(mockSetTaskProgress).toHaveBeenCalledWith({
        total: 3,
        completed: 3,
        percentage: 100,
      });
    });

    it('should do nothing when no tasks content', async () => {
      const detailWithoutTasks: SpecDetail = {
        ...mockSpecDetail,
        artifacts: {
          ...mockSpecDetail.artifacts,
          tasks: null,
        },
      };

      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => detailWithoutTasks,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      await service.syncTaskProgress();

      expect(mockSetTaskProgress).not.toHaveBeenCalled();
    });
  });

  describe('editor sync callback', () => {
    it('should call editorSyncCallback when artifact matches active tab', async () => {
      window.electronAPI.readArtifact = vi.fn().mockResolvedValue('# Updated');

      service.init({
        getSelectedSpec: () => mockSpec,
        getSpecDetail: () => mockSpecDetail,
        setSpecJson: mockSetSpecJson,
        setArtifact: mockSetArtifact,
        setTaskProgress: mockSetTaskProgress,
        setParallelTaskInfo: vi.fn(),
        updateSpecMetadata: mockUpdateSpecMetadata,
        editorSyncCallback: mockEditorSyncCallback,
      });

      await service.updateArtifact('requirements');

      // spec-path-ssot-refactor: editorSyncCallback now takes specName instead of path
      expect(mockEditorSyncCallback).toHaveBeenCalledWith(mockSpec.name, 'requirements');
    });
  });
});
