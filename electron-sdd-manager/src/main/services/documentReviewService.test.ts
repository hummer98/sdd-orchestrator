/**
 * DocumentReviewService Tests
 * TDD: Testing document review service functionality
 * Requirements: 1.1, 1.2, 1.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.5, 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { SpecJson } from '../../renderer/types';

// Mock electron before importing modules that use it
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/tmp/test-logs',
  },
}));

// Mock fs (for logger)
vi.mock('fs', () => ({
  existsSync: () => true,
  mkdirSync: vi.fn(),
  createWriteStream: () => ({
    write: vi.fn(),
  }),
}));

// Mock fs/promises
vi.mock('fs/promises');

// Import after mocks are set up
const { DocumentReviewService } = await import('./documentReviewService');

const mockProjectPath = '/test/project';
const mockSpecPath = '/test/project/.kiro/specs/test-feature';

describe('DocumentReviewService', () => {
  let service: DocumentReviewService;

  beforeEach(() => {
    service = new DocumentReviewService(mockProjectPath);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock spec.json
  const createMockSpecJson = (overrides: Partial<SpecJson> = {}): SpecJson => ({
    feature_name: 'test-feature',
    created_at: '2025-12-11T00:00:00Z',
    updated_at: '2025-12-11T00:00:00Z',
    language: 'ja',
    phase: 'tasks-generated',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
    ...overrides,
  });

  // ============================================================
  // Task 2.1: Review precondition validation
  // Requirements: 1.1, 1.2, 1.4, 8.4
  // ============================================================
  describe('Task 2.1: canStartReview', () => {
    it('should return true when tasks phase is approved and impl not started', async () => {
      const specJson = createMockSpecJson();
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await service.canStartReview(mockSpecPath);
      expect(result).toBe(true);
    });

    it('should return false when tasks phase is not approved', async () => {
      const specJson = createMockSpecJson({
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: false },
        },
      });
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canStartReview(mockSpecPath);
      expect(result).toBe(false);
    });

    it('should return false when implementation is complete', async () => {
      const specJson = createMockSpecJson({
        phase: 'implementation-complete',
      });
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canStartReview(mockSpecPath);
      expect(result).toBe(false);
    });

    it('should return false when document review is already approved', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'approved' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canStartReview(mockSpecPath);
      expect(result).toBe(false);
    });

    it('should return true when document review is pending', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await service.canStartReview(mockSpecPath);
      expect(result).toBe(true);
    });
  });

  describe('Task 2.1: validateDocuments', () => {
    it('should return ok when all required documents exist', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await service.validateDocuments(mockSpecPath);
      expect(result.ok).toBe(true);
    });

    it('should return error when requirements.md is missing', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath).includes('requirements.md')) {
          throw new Error('ENOENT');
        }
        return undefined;
      });

      const result = await service.validateDocuments(mockSpecPath);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('FILE_NOT_FOUND');
        expect(result.error.path).toContain('requirements.md');
      }
    });

    it('should return error when design.md is missing', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath).includes('design.md')) {
          throw new Error('ENOENT');
        }
        return undefined;
      });

      const result = await service.validateDocuments(mockSpecPath);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('FILE_NOT_FOUND');
        expect(result.error.path).toContain('design.md');
      }
    });

    it('should return error when tasks.md is missing', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath).includes('tasks.md')) {
          throw new Error('ENOENT');
        }
        return undefined;
      });

      const result = await service.validateDocuments(mockSpecPath);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('FILE_NOT_FOUND');
        expect(result.error.path).toContain('tasks.md');
      }
    });
  });

  // ============================================================
  // Task 2.2: spec.json documentReview field management
  // Requirements: 4.2, 5.5
  // ============================================================
  describe('Task 2.2: initializeReviewState', () => {
    it('should initialize documentReview field with status: pending', async () => {
      const specJson = createMockSpecJson();
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.initializeReviewState(mockSpecPath);
      expect(result.ok).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview).toEqual({
        status: 'pending',
      });
    });

    it('should not reinitialize if documentReview already exists', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.initializeReviewState(mockSpecPath);
      expect(result.ok).toBe(true);
      expect(vi.mocked(fs.writeFile)).not.toHaveBeenCalled();
    });
  });

  describe('Task 2.2: updateReviewState', () => {
    it('should update status to in_progress', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.updateReviewState(mockSpecPath, { status: 'in_progress' });
      expect(result.ok).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.status).toBe('in_progress');
    });

    it('should update roundDetails', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
          roundDetails: [
            { roundNumber: 1, status: 'reply_complete' as const },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.updateReviewState(mockSpecPath, {
        roundDetail: { roundNumber: 2, status: 'incomplete' },
      });
      expect(result.ok).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.roundDetails.length).toBe(2);
    });
  });

  // ============================================================
  // Task 2.3: Round number management
  // Requirements: 2.5, 4.1, 4.5
  // ============================================================
  describe('Task 2.3: getNextRoundNumber', () => {
    it('should return 1 when no review files exist', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const roundNumber = await service.getNextRoundNumber(mockSpecPath);
      expect(roundNumber).toBe(1);
    });

    it('should return 2 when document-review-1.md exists', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const roundNumber = await service.getNextRoundNumber(mockSpecPath);
      expect(roundNumber).toBe(2);
    });

    it('should return 3 when document-review-1.md and document-review-2.md exist', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-2.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-reply-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-reply-2.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const roundNumber = await service.getNextRoundNumber(mockSpecPath);
      expect(roundNumber).toBe(3);
    });

    it('should handle non-sequential numbering correctly', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-5.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const roundNumber = await service.getNextRoundNumber(mockSpecPath);
      expect(roundNumber).toBe(6);
    });
  });

  describe('Task 2.3: getCurrentRoundNumber', () => {
    it('should return 0 when no review files exist', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const roundNumber = await service.getCurrentRoundNumber(mockSpecPath);
      expect(roundNumber).toBe(0);
    });

    it('should return highest existing round number', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-2.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const roundNumber = await service.getCurrentRoundNumber(mockSpecPath);
      expect(roundNumber).toBe(2);
    });
  });

  // ============================================================
  // Task 5.1: Review approval
  // Requirements: 4.4
  // ============================================================
  describe('Task 5.1: approveReview', () => {
    it('should set status to approved', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.approveReview(mockSpecPath);
      expect(result.ok).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.status).toBe('approved');
    });

    it('should return error if already approved', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'approved' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.approveReview(mockSpecPath);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_APPROVED');
      }
    });
  });

  // ============================================================
  // Task 5.2: Skip review
  // Requirements: 1.3
  // ============================================================
  describe('Task 5.2: skipReview', () => {
    it('should set status to skipped', async () => {
      const specJson = createMockSpecJson();
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.skipReview(mockSpecPath);
      expect(result.ok).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.status).toBe('skipped');
    });

    it('should return error if already approved', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'approved' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.skipReview(mockSpecPath);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_APPROVED');
      }
    });
  });

  // ============================================================
  // Task 4.2: Retry round
  // Requirements: 8.3
  // ============================================================
  describe('Task 4.2: canRetryRound', () => {
    it('should return true for incomplete round', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
          roundDetails: [
            { roundNumber: 1, status: 'incomplete' as const },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canRetryRound(mockSpecPath, 1);
      expect(result).toBe(true);
    });

    it('should return false for completed round', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
          roundDetails: [
            { roundNumber: 1, status: 'reply_complete' as const },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canRetryRound(mockSpecPath, 1);
      expect(result).toBe(false);
    });

    it('should return false if review is already approved', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'approved' as const,
          roundDetails: [
            { roundNumber: 1, status: 'reply_complete' as const },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canRetryRound(mockSpecPath, 1);
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // Task 2.1: getReviewState
  // ============================================================
  describe('getReviewState', () => {
    it('should return null when documentReview field does not exist', async () => {
      const specJson = createMockSpecJson();
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const state = await service.getReviewState(mockSpecPath);
      expect(state).toBeNull();
    });

    it('should return DocumentReviewState when field exists', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'approved' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const state = await service.getReviewState(mockSpecPath);
      expect(state).toEqual({
        status: 'approved',
      });
    });
  });

  // ============================================================
  // Task 3.3: Review round execution flow control
  // Requirements: 1.1, 4.1, 4.3
  // ============================================================
  describe('Task 3.3: startReviewRound', () => {
    it('should start a new review round successfully', async () => {
      const specJson = createMockSpecJson();
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.startReviewRound(mockSpecPath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(1);
      }
    });

    it('should return error when preconditions not met', async () => {
      const specJson = createMockSpecJson({
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: false },
        },
      });
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.startReviewRound(mockSpecPath);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PRECONDITION_FAILED');
      }
    });
  });

  describe('Task 3.3: markReviewComplete', () => {
    it('should mark review as complete', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
          currentRound: 1,
          roundDetails: [{ roundNumber: 1, status: 'incomplete' as const }],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.markReviewComplete(mockSpecPath, 1);
      expect(result.ok).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.roundDetails[0].status).toBe('review_complete');
      expect(writtenContent.documentReview.roundDetails[0].reviewCompletedAt).toBeDefined();
    });
  });

  describe('Task 3.3: completeRound', () => {
    it('should complete round', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
          currentRound: 1,
          roundDetails: [{ roundNumber: 1, status: 'review_complete' as const }],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.completeRound(mockSpecPath, 1);
      expect(result.ok).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.roundDetails[0].status).toBe('reply_complete');
      expect(writtenContent.documentReview.roundDetails[0].replyCompletedAt).toBeDefined();
    });
  });

  describe('Task 3.3: canAddRound', () => {
    it('should return true when review is pending', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canAddRound(mockSpecPath);
      expect(result).toBe(true);
    });

    it('should return false when review is approved', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'approved' as const,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canAddRound(mockSpecPath);
      expect(result).toBe(false);
    });

    it('should return false when review is in progress', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
          currentRound: 2,
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));

      const result = await service.canAddRound(mockSpecPath);
      expect(result).toBe(false);
    });
  });

  describe('Task 4.1: markRoundIncomplete', () => {
    it('should mark round as incomplete and reset state', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'in_progress' as const,
          currentRound: 1,
          roundDetails: [],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.markRoundIncomplete(mockSpecPath, 1);
      expect(result.ok).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.status).toBe('pending');
      expect(writtenContent.documentReview.currentRound).toBeUndefined();
    });
  });

  // ============================================================
  // fix-status-field-migration Task 2.1: normalizeRoundDetail migration
  // Requirements: 5.1, 5.2, 5.3, 5.4
  // ============================================================
  describe('fix-status-field-migration Task 2.1: normalizeRoundDetail migration', () => {
    it('should convert fixApplied: true to fixStatus: applied', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
          roundDetails: [
            { roundNumber: 1, status: 'reply_complete' as const, fixApplied: true, fixRequired: 2 },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-1-reply.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.syncReviewState(mockSpecPath);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.roundDetails[0].fixStatus).toBe('applied');
    });

    it('should convert fixApplied: false with fixRequired > 0 to fixStatus: pending', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
          roundDetails: [
            { roundNumber: 1, status: 'reply_complete' as const, fixApplied: false, fixRequired: 3 },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-1-reply.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.syncReviewState(mockSpecPath);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.roundDetails[0].fixStatus).toBe('pending');
    });

    it('should convert fixApplied: undefined with needsDiscussion > 0 to fixStatus: pending', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
          roundDetails: [
            { roundNumber: 1, status: 'reply_complete' as const, fixRequired: 0, needsDiscussion: 2 },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-1-reply.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.syncReviewState(mockSpecPath);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.roundDetails[0].fixStatus).toBe('pending');
    });

    it('should convert fixApplied: undefined with fixRequired = 0 AND needsDiscussion = 0 to fixStatus: not_required', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
          roundDetails: [
            { roundNumber: 1, status: 'reply_complete' as const, fixRequired: 0, needsDiscussion: 0 },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-1-reply.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.syncReviewState(mockSpecPath);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.documentReview.roundDetails[0].fixStatus).toBe('not_required');
    });

    it('should preserve existing fixStatus (not overwrite)', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
          roundDetails: [
            { roundNumber: 1, status: 'reply_complete' as const, fixStatus: 'applied', fixRequired: 0 },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-1-reply.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.syncReviewState(mockSpecPath);

      // Should not write if nothing changed except normalization
      // The fixStatus was already set, so it should be preserved
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      if (writeCall) {
        const writtenContent = JSON.parse(writeCall[1] as string);
        expect(writtenContent.documentReview.roundDetails[0].fixStatus).toBe('applied');
      }
    });

    it('should prioritize fixStatus over fixApplied when both exist', async () => {
      const specJson = {
        ...createMockSpecJson(),
        documentReview: {
          status: 'pending' as const,
          roundDetails: [
            // Both fixApplied and fixStatus exist - fixStatus should take priority
            { roundNumber: 1, status: 'reply_complete' as const, fixApplied: true, fixStatus: 'pending', fixRequired: 5 },
          ],
        },
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(specJson));
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true, isDirectory: () => false },
        { name: 'document-review-1-reply.md', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.syncReviewState(mockSpecPath);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      if (writeCall) {
        const writtenContent = JSON.parse(writeCall[1] as string);
        // fixStatus should be preserved as 'pending' even though fixApplied: true
        expect(writtenContent.documentReview.roundDetails[0].fixStatus).toBe('pending');
      }
    });
  });

});
