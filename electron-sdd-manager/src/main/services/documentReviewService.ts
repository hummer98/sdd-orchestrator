/**
 * DocumentReviewService
 * Manages document review workflow lifecycle
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.5, 8.1, 8.2, 8.3, 8.4
 */

import { readFile, writeFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import type { SpecJson } from '../../renderer/types';
import type {
  DocumentReviewState,
  ReviewError,
  RoundDetail,
  ReviewStatus,
  RoundStatus,
} from '../../renderer/types/documentReview';
import {
  createInitialReviewState,
  isDocumentReviewState,
} from '../../renderer/types/documentReview';
import { logger } from './logger';

/** Extended SpecJson with documentReview field */
interface SpecJsonWithReview extends SpecJson {
  documentReview?: DocumentReviewState;
}

/** Result type for operations */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Update options for review state */
export interface UpdateReviewStateOptions {
  status?: ReviewStatus;
  currentRound?: number;
  roundDetail?: Partial<RoundDetail>;
}

/**
 * Service for managing document review workflow
 */
export class DocumentReviewService {
  // Note: projectPath is kept for potential future use
  constructor(_projectPath: string) {
    // projectPath may be needed for future operations
  }

  // ============================================================
  // Task 2.1: Review precondition validation
  // Requirements: 1.1, 1.2, 1.4, 8.4
  // ============================================================

  /**
   * Check if document review can be started
   * @param specPath - Path to the spec directory
   * @returns true if review can be started
   */
  async canStartReview(specPath: string): Promise<boolean> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath);

      // Check if tasks phase is approved
      if (!specJson.approvals.tasks.approved) {
        logger.debug('[DocumentReviewService] Tasks not approved');
        return false;
      }

      // Check if implementation is complete
      if (specJson.phase === 'implementation-complete') {
        logger.debug('[DocumentReviewService] Implementation already complete');
        return false;
      }

      // Check if document review is already approved
      const reviewState = (specJson as SpecJsonWithReview).documentReview;
      if (reviewState && reviewState.status === 'approved') {
        logger.debug('[DocumentReviewService] Review already approved');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('[DocumentReviewService] Error checking canStartReview', { error });
      return false;
    }
  }

  /**
   * Validate that required documents exist
   * Requirements: 8.4
   */
  async validateDocuments(specPath: string): Promise<Result<void, ReviewError>> {
    const requiredDocs = ['requirements.md', 'design.md', 'tasks.md'];

    for (const doc of requiredDocs) {
      const docPath = join(specPath, doc);
      try {
        await access(docPath);
      } catch {
        return {
          ok: false,
          error: {
            type: 'FILE_NOT_FOUND',
            path: docPath,
          },
        };
      }
    }

    return { ok: true, value: undefined };
  }

  // ============================================================
  // Task 2.2: spec.json documentReview field management
  // Requirements: 4.2, 5.5
  // ============================================================

  /**
   * Initialize documentReview field in spec.json
   * Requirements: 5.5
   */
  async initializeReviewState(specPath: string): Promise<Result<void, ReviewError>> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath) as SpecJsonWithReview;

      // Don't reinitialize if already exists
      if (specJson.documentReview) {
        return { ok: true, value: undefined };
      }

      // Initialize with default values
      specJson.documentReview = createInitialReviewState();
      specJson.updated_at = new Date().toISOString();

      await this.writeSpecJson(specPath, specJson);
      return { ok: true, value: undefined };
    } catch (error) {
      logger.error('[DocumentReviewService] Error initializing review state', { error });
      return {
        ok: false,
        error: {
          type: 'AGENT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Update documentReview state in spec.json
   * Requirements: 4.2
   */
  async updateReviewState(
    specPath: string,
    options: UpdateReviewStateOptions
  ): Promise<Result<void, ReviewError>> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath) as SpecJsonWithReview;

      // Ensure documentReview exists
      if (!specJson.documentReview) {
        specJson.documentReview = createInitialReviewState();
      }

      // Update status
      if (options.status) {
        specJson.documentReview.status = options.status;
      }

      // Update currentRound (explicitly handle undefined to clear the value)
      if ('currentRound' in options) {
        if (options.currentRound === undefined) {
          delete specJson.documentReview.currentRound;
        } else {
          specJson.documentReview.currentRound = options.currentRound;
        }
      }

      // Update round detail
      if (options.roundDetail) {
        if (!specJson.documentReview.roundDetails) {
          specJson.documentReview.roundDetails = [];
        }

        const existingIndex = specJson.documentReview.roundDetails.findIndex(
          (r) => r.roundNumber === options.roundDetail?.roundNumber
        );

        if (existingIndex >= 0) {
          specJson.documentReview.roundDetails[existingIndex] = {
            ...specJson.documentReview.roundDetails[existingIndex],
            ...options.roundDetail,
          } as RoundDetail;
        } else if (options.roundDetail.roundNumber && options.roundDetail.status) {
          specJson.documentReview.roundDetails.push(options.roundDetail as RoundDetail);
        }
      }

      specJson.updated_at = new Date().toISOString();
      await this.writeSpecJson(specPath, specJson);
      return { ok: true, value: undefined };
    } catch (error) {
      logger.error('[DocumentReviewService] Error updating review state', { error });
      return {
        ok: false,
        error: {
          type: 'AGENT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ============================================================
  // Task 2.3: Round number management
  // Requirements: 2.5, 4.1, 4.5
  // ============================================================

  /**
   * Get the next round number (max existing + 1)
   * Requirements: 2.5
   */
  async getNextRoundNumber(specPath: string): Promise<number> {
    const currentRound = await this.getCurrentRoundNumber(specPath);
    return currentRound + 1;
  }

  /**
   * Get the current (highest) round number from existing files
   * Requirements: 4.1
   */
  async getCurrentRoundNumber(specPath: string): Promise<number> {
    try {
      const files = await readdir(specPath, { withFileTypes: true });
      const reviewFiles = files
        .filter((f) => f.isFile() && f.name.match(/^document-review-\d+\.md$/))
        .map((f) => {
          const match = f.name.match(/^document-review-(\d+)\.md$/);
          return match ? parseInt(match[1], 10) : 0;
        });

      if (reviewFiles.length === 0) {
        return 0;
      }

      return Math.max(...reviewFiles);
    } catch {
      return 0;
    }
  }

  // ============================================================
  // Task 5.1: Review approval
  // Requirements: 4.4
  // ============================================================

  /**
   * Approve the document review workflow
   */
  async approveReview(specPath: string): Promise<Result<void, ReviewError>> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath) as SpecJsonWithReview;

      // Check if already approved
      if (specJson.documentReview?.status === 'approved') {
        return {
          ok: false,
          error: { type: 'ALREADY_APPROVED' },
        };
      }

      return this.updateReviewState(specPath, { status: 'approved' });
    } catch (error) {
      logger.error('[DocumentReviewService] Error approving review', { error });
      return {
        ok: false,
        error: {
          type: 'AGENT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ============================================================
  // Task 5.2: Skip review
  // Requirements: 1.3
  // ============================================================

  /**
   * Skip the document review workflow
   */
  async skipReview(specPath: string): Promise<Result<void, ReviewError>> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath) as SpecJsonWithReview;

      // Check if already approved
      if (specJson.documentReview?.status === 'approved') {
        return {
          ok: false,
          error: { type: 'ALREADY_APPROVED' },
        };
      }

      // Initialize if not exists and set to skipped
      if (!specJson.documentReview) {
        specJson.documentReview = createInitialReviewState();
      }
      specJson.documentReview.status = 'skipped';
      specJson.updated_at = new Date().toISOString();

      await this.writeSpecJson(specPath, specJson);
      return { ok: true, value: undefined };
    } catch (error) {
      logger.error('[DocumentReviewService] Error skipping review', { error });
      return {
        ok: false,
        error: {
          type: 'AGENT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ============================================================
  // Task 4.2: Retry round
  // Requirements: 8.3
  // ============================================================

  /**
   * Check if a round can be retried
   */
  async canRetryRound(specPath: string, roundNumber: number): Promise<boolean> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath) as SpecJsonWithReview;
      const reviewState = specJson.documentReview;

      // Cannot retry if already approved
      if (reviewState?.status === 'approved') {
        return false;
      }

      // Check round status
      const roundDetail = reviewState?.roundDetails?.find(
        (r) => r.roundNumber === roundNumber
      );

      // Can retry if incomplete
      if (roundDetail?.status === 'incomplete') {
        return true;
      }

      // Cannot retry completed rounds
      if (roundDetail?.status === 'reply_complete') {
        return false;
      }

      // Can retry if round doesn't exist yet
      return !roundDetail;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Get review state
  // ============================================================

  /**
   * Get the current document review state
   * @returns DocumentReviewState or null if not initialized
   */
  async getReviewState(specPath: string): Promise<DocumentReviewState | null> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath) as SpecJsonWithReview;
      const reviewState = specJson.documentReview;

      if (reviewState && isDocumentReviewState(reviewState)) {
        return reviewState;
      }

      return null;
    } catch {
      return null;
    }
  }

  // ============================================================
  // Task 3.3: Review round execution flow control
  // Requirements: 1.1, 4.1, 4.3
  // ============================================================

  /**
   * Start a new review round
   * Returns the round number that was started
   * Requirements: 1.1
   */
  async startReviewRound(specPath: string): Promise<Result<number, ReviewError>> {
    // Validate preconditions
    const canStart = await this.canStartReview(specPath);
    if (!canStart) {
      return {
        ok: false,
        error: {
          type: 'PRECONDITION_FAILED',
          message: 'Cannot start review: preconditions not met',
        },
      };
    }

    // Validate documents exist
    const docsResult = await this.validateDocuments(specPath);
    if (!docsResult.ok) {
      return docsResult;
    }

    // Initialize review state if needed
    await this.initializeReviewState(specPath);

    // Get next round number
    const roundNumber = await this.getNextRoundNumber(specPath);

    // Update state to in_progress with current round
    const updateResult = await this.updateReviewState(specPath, {
      status: 'in_progress',
      currentRound: roundNumber,
      roundDetail: {
        roundNumber,
        status: 'incomplete',
      },
    });

    if (!updateResult.ok) {
      return updateResult;
    }

    logger.info('[DocumentReviewService] Started review round', { specPath, roundNumber });
    return { ok: true, value: roundNumber };
  }

  /**
   * Mark review agent as completed for a round
   * Requirements: 4.1
   */
  async markReviewComplete(specPath: string, roundNumber: number): Promise<Result<void, ReviewError>> {
    return this.updateReviewState(specPath, {
      roundDetail: {
        roundNumber,
        status: 'review_complete',
        reviewCompletedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Complete a review round (after reply agent completes)
   * Requirements: 4.1
   */
  async completeRound(specPath: string, roundNumber: number): Promise<Result<void, ReviewError>> {
    return this.updateReviewState(specPath, {
      status: 'pending',
      currentRound: undefined,
      roundDetail: {
        roundNumber,
        status: 'reply_complete',
        replyCompletedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Mark a round as failed/incomplete
   * Requirements: 8.2
   */
  async markRoundIncomplete(specPath: string, roundNumber: number): Promise<Result<void, ReviewError>> {
    return this.updateReviewState(specPath, {
      status: 'pending',
      currentRound: undefined,
      roundDetail: {
        roundNumber,
        status: 'incomplete',
      },
    });
  }

  /**
   * Check if additional rounds can be added
   * Requirements: 4.3
   */
  async canAddRound(specPath: string): Promise<boolean> {
    try {
      const reviewState = await this.getReviewState(specPath);

      // Cannot add if approved or skipped
      if (reviewState?.status === 'approved' || reviewState?.status === 'skipped') {
        return false;
      }

      // Cannot add if currently running
      if (reviewState?.currentRound !== undefined) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Sync review state with file system
  // ============================================================

  /**
   * Sync documentReview state with actual file system state
   * Detects document-review-*.md files and updates spec.json accordingly
   * @returns true if spec.json was modified
   */
  async syncReviewState(specPath: string): Promise<boolean> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath) as SpecJsonWithReview;
      const currentRoundFromFiles = await this.getCurrentRoundNumber(specPath);

      // If no review files exist and no documentReview field, nothing to sync
      if (currentRoundFromFiles === 0 && !specJson.documentReview) {
        return false;
      }

      let modified = false;

      // Case 1: Files exist but no documentReview field - initialize it
      if (currentRoundFromFiles > 0 && !specJson.documentReview) {
        logger.info('[DocumentReviewService] Syncing: Files exist but no documentReview field', {
          specPath,
          roundsFromFiles: currentRoundFromFiles,
        });
        specJson.documentReview = {
          status: 'pending',
        };
        modified = true;
      }

      // Sync roundDetails from file system
      if (specJson.documentReview) {
        const roundDetails = await this.detectRoundDetails(specPath, currentRoundFromFiles);
        const existingDetails = specJson.documentReview.roundDetails || [];
        const mergedDetails = this.mergeRoundDetails(existingDetails, roundDetails);
        if (JSON.stringify(existingDetails) !== JSON.stringify(mergedDetails)) {
          specJson.documentReview.roundDetails = mergedDetails;
          modified = true;
        }
      }

      if (modified) {
        specJson.updated_at = new Date().toISOString();
        await this.writeSpecJson(specPath, specJson);
        logger.info('[DocumentReviewService] Synced documentReview state', { specPath });
      }

      return modified;
    } catch (error) {
      logger.error('[DocumentReviewService] Error syncing review state', { error, specPath });
      return false;
    }
  }

  /**
   * Detect round details from file system
   */
  private async detectRoundDetails(specPath: string, maxRound: number): Promise<RoundDetail[]> {
    const details: RoundDetail[] = [];

    for (let round = 1; round <= maxRound; round++) {
      const reviewFile = join(specPath, `document-review-${round}.md`);
      const replyFile = join(specPath, `document-review-${round}-reply.md`);

      let hasReview = false;
      let hasReply = false;

      try {
        await access(reviewFile);
        hasReview = true;
      } catch {
        // File doesn't exist
      }

      try {
        await access(replyFile);
        hasReply = true;
      } catch {
        // File doesn't exist
      }

      if (hasReview) {
        let status: RoundStatus = 'incomplete';
        if (hasReply) {
          status = 'reply_complete';
        } else if (hasReview) {
          status = 'review_complete';
        }

        details.push({
          roundNumber: round,
          status,
        });
      }
    }

    return details;
  }

  /**
   * Normalize a round detail object to ensure it has the correct schema
   * Handles legacy data with 'round' instead of 'roundNumber' and missing fields
   */
  private normalizeRoundDetail(detail: Record<string, unknown>, index: number): RoundDetail | null {
    // Extract roundNumber from various possible sources
    const roundNumber = (detail.roundNumber as number) ?? (detail.round as number) ?? (index + 1);

    // Skip entries without a valid roundNumber
    if (typeof roundNumber !== 'number' || isNaN(roundNumber) || roundNumber < 1) {
      logger.warn('[DocumentReviewService] Skipping invalid round detail', { detail });
      return null;
    }

    // Build normalized RoundDetail
    const normalized: RoundDetail = {
      roundNumber,
      status: (detail.status as RoundStatus) ?? 'incomplete',
    };

    // Preserve optional fields if they exist
    if (detail.reviewCompletedAt) {
      normalized.reviewCompletedAt = detail.reviewCompletedAt as string;
    }
    if (detail.replyCompletedAt) {
      normalized.replyCompletedAt = detail.replyCompletedAt as string;
    }
    if (detail.fixApplied !== undefined) {
      normalized.fixApplied = detail.fixApplied as boolean;
    }

    return normalized;
  }

  /**
   * Merge existing round details with detected ones
   */
  private mergeRoundDetails(existing: RoundDetail[], detected: RoundDetail[]): RoundDetail[] {
    const merged = new Map<number, RoundDetail>();

    // Add existing details first (with normalization)
    for (let i = 0; i < existing.length; i++) {
      const normalized = this.normalizeRoundDetail(existing[i] as unknown as Record<string, unknown>, i);
      if (normalized) {
        merged.set(normalized.roundNumber, normalized);
      }
    }

    // Override with detected details (file system is source of truth for status)
    for (const detail of detected) {
      const existingDetail = merged.get(detail.roundNumber);
      if (existingDetail) {
        // Keep timestamps but update status based on file existence
        merged.set(detail.roundNumber, {
          ...existingDetail,
          status: detail.status,
        });
      } else {
        merged.set(detail.roundNumber, detail);
      }
    }

    return Array.from(merged.values()).sort((a, b) => a.roundNumber - b.roundNumber);
  }

  // ============================================================
  // Helper methods
  // ============================================================

  /**
   * Read spec.json from spec directory (internal use)
   */
  private async readSpecJsonInternal(specPath: string): Promise<SpecJsonWithReview> {
    const specJsonPath = join(specPath, 'spec.json');
    const content = await readFile(specJsonPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Read spec.json from spec directory (public, returns Result type)
   * Used by handlers.ts to check documentReview.status after document-review-reply completion
   */
  async readSpecJson(specPath: string): Promise<Result<SpecJsonWithReview, ReviewError>> {
    try {
      const specJson = await this.readSpecJsonInternal(specPath);
      return { ok: true, value: specJson };
    } catch (error) {
      logger.error('[DocumentReviewService] Error reading spec.json', { error, specPath });
      return {
        ok: false,
        error: {
          type: 'FILE_NOT_FOUND',
          path: join(specPath, 'spec.json'),
        },
      };
    }
  }

  /**
   * Write spec.json to spec directory
   */
  private async writeSpecJson(specPath: string, specJson: SpecJsonWithReview): Promise<void> {
    const specJsonPath = join(specPath, 'spec.json');
    await writeFile(specJsonPath, JSON.stringify(specJson, null, 2), 'utf-8');
  }

}
