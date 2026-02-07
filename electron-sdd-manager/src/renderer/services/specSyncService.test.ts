/**
 * SpecSyncService Tests
 * TDD: Testing file sync service for spec store
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ArtifactInfo, TaskProgress, SpecDetail } from '../types';
import type { SpecDetailState, ArtifactType } from '../stores/spec/types';

// trpc-full-migration Task 4.3: Mock tRPC vanilla client for file operations
const mockVanillaClient = {
  file: {
    readSpecJson: { query: vi.fn() },
    readArtifact: { query: vi.fn() },
  },
  // trpc-full-migration Task 5.3: Mock spec procedures for syncDocumentReview
  spec: {
    syncDocumentReview: { mutate: vi.fn() },
  },
};
vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => mockVanillaClient,
}));

import { SpecSyncService } from './specSyncService';

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
      mockVanillaClient.file.readSpecJson.query.mockResolvedValue(updatedSpecJson);

      await service.updateSpecJson();

      // trpc-full-migration Task 4.3: readSpecJson now uses tRPC with object params
      expect(mockVanillaClient.file.readSpecJson.query).toHaveBeenCalledWith({ specName: mockSpec.name });
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

      await service.updateSpecJson();

      expect(mockVanillaClient.file.readSpecJson.query).not.toHaveBeenCalled();
      expect(mockSetSpecJson).not.toHaveBeenCalled();
    });

    it('should also update spec metadata in list', async () => {
      mockVanillaClient.file.readSpecJson.query.mockResolvedValue(mockSpecJson);

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

      mockVanillaClient.file.readSpecJson.query.mockResolvedValue(specJsonWithInspection);
      mockVanillaClient.file.readArtifact.query.mockResolvedValue(inspectionContent);

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
      mockVanillaClient.file.readArtifact.query.mockResolvedValue(newContent);

      await service.updateArtifact('requirements');

      // trpc-full-migration Task 4.3: readArtifact now uses tRPC with object params
      expect(mockVanillaClient.file.readArtifact.query).toHaveBeenCalledWith({
        name: mockSpec.name,
        filename: 'requirements.md',
        entityType: 'spec',
      });
      expect(mockSetArtifact).toHaveBeenCalledWith('requirements', {
        exists: true,
        updatedAt: null,
        content: newContent,
      });
    });

    it('should set artifact to null when file not found', async () => {
      mockVanillaClient.file.readArtifact.query.mockRejectedValue(new Error('Not found'));

      await service.updateArtifact('research');

      expect(mockSetArtifact).toHaveBeenCalledWith('research', null);
    });

    it('should recalculate taskProgress when tasks artifact changes (Req 3.6)', async () => {
      const tasksContent = `# Tasks
- [x] Task 1 completed
- [x] Task 2 completed
- [ ] Task 3 pending`;

      mockVanillaClient.file.readArtifact.query.mockResolvedValue(tasksContent);

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

      await service.updateArtifact('requirements');

      expect(mockVanillaClient.file.readArtifact.query).not.toHaveBeenCalled();
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
      // trpc-full-migration Task 5.3: syncDocumentReview via tRPC
      mockVanillaClient.spec.syncDocumentReview.mutate.mockResolvedValue(true);
      // trpc-full-migration Task 4.3: readSpecJson via tRPC
      mockVanillaClient.file.readSpecJson.query.mockResolvedValue(updatedSpecJson);

      await service.syncDocumentReviewState();

      // trpc-full-migration Task 5.3: syncDocumentReview via tRPC
      expect(mockVanillaClient.spec.syncDocumentReview.mutate).toHaveBeenCalledWith({ specName: mockSpec.name });
      // readSpecJson is now via tRPC
      expect(mockVanillaClient.file.readSpecJson.query).toHaveBeenCalledWith({ specName: mockSpec.name });
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

      mockVanillaClient.spec.syncDocumentReview.mutate.mockResolvedValue(false);

      await service.syncDocumentReviewState();

      expect(mockVanillaClient.spec.syncDocumentReview.mutate).not.toHaveBeenCalled();
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

      mockVanillaClient.file.readSpecJson.query.mockResolvedValue(specJsonWithInspection);
      mockVanillaClient.file.readArtifact.query.mockResolvedValue(inspectionContent);

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

      await service.syncInspectionState();

      expect(mockVanillaClient.file.readSpecJson.query).not.toHaveBeenCalled();
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
      mockVanillaClient.file.readArtifact.query.mockResolvedValue('# Updated');

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
