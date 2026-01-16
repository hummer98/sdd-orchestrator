/**
 * BugWorkflowService
 * Service for bug workflow operations including auto-execution worktree handling
 * bugs-worktree-support Task 19.1: 自動worktree判定機能
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { logger } from './logger';
import type { ConfigStore } from './configStore';
import type { WorktreeService } from './worktreeService';
import type { BugService } from './bugService';
import type { WorktreeServiceResult } from '../../renderer/types/worktree';
import type { BugWorktreeConfig } from '../../renderer/types/bugJson';

/**
 * BugWorkflowService
 * Manages bug workflow operations including auto-execution worktree creation
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */
export class BugWorkflowService {
  private configStore: ConfigStore;
  private worktreeServiceFactory: (projectPath: string) => WorktreeService;
  private bugService: BugService;

  /**
   * Create a new BugWorkflowService
   * @param configStore - Configuration store for reading settings
   * @param worktreeServiceFactory - Factory function to create WorktreeService for a project path
   * @param bugService - Bug service for bug.json operations
   */
  constructor(
    configStore: ConfigStore,
    worktreeServiceFactory: (projectPath: string) => WorktreeService,
    bugService: BugService
  ) {
    this.configStore = configStore;
    this.worktreeServiceFactory = worktreeServiceFactory;
    this.bugService = bugService;
  }

  /**
   * Check if worktree should be created for auto-execution
   * Requirements: 12.1, 12.3
   * @returns true if bugsWorktreeDefault is enabled
   */
  shouldCreateWorktreeForAutoExecution(): boolean {
    return this.configStore.getBugsWorktreeDefault();
  }

  /**
   * Start bug-fix with auto-execution worktree handling
   * Requirements: 12.1, 12.2, 12.3, 12.4
   *
   * This method is called during auto-execution to determine whether to create
   * a worktree before starting the bug-fix phase. It respects the project's
   * bugsWorktreeDefault setting and uses the same worktree creation logic
   * as the UI checkbox (DRY principle).
   *
   * @param bugName - Bug name
   * @param projectPath - Project path
   * @param bugPath - Path to bug directory (.kiro/bugs/{bugName})
   * @returns Result with BugWorktreeConfig if worktree was created, null if not
   */
  async startBugFixWithAutoWorktree(
    bugName: string,
    projectPath: string,
    bugPath: string
  ): Promise<WorktreeServiceResult<BugWorktreeConfig | null>> {
    logger.info('[BugWorkflowService] startBugFixWithAutoWorktree called', {
      bugName,
      projectPath,
      bugPath,
    });

    // Requirements: 12.1 - Reference bugsWorktreeDefault setting from configStore
    const shouldCreateWorktree = this.shouldCreateWorktreeForAutoExecution();

    // Requirements: 12.3 - Do not create worktree when bugsWorktreeDefault is false
    if (!shouldCreateWorktree) {
      logger.info('[BugWorkflowService] bugsWorktreeDefault is false, skipping worktree creation');
      return { ok: true, value: null };
    }

    // Requirements: 12.2, 12.4 - Create worktree using the same logic as UI
    // This shares the same logic as handleBugWorktreeCreate in bugWorktreeHandlers
    const worktreeService = this.worktreeServiceFactory(projectPath);

    // Create the worktree (includes main branch check)
    const createResult = await worktreeService.createBugWorktree(bugName);
    if (!createResult.ok) {
      logger.error('[BugWorkflowService] Failed to create bug worktree', {
        error: createResult.error,
      });
      return createResult;
    }

    // Update bug.json with worktree field (same as handleBugWorktreeCreate)
    const worktreeConfig: BugWorktreeConfig = {
      path: createResult.value.path,
      branch: createResult.value.branch,
      created_at: createResult.value.created_at,
    };

    const updateResult = await this.bugService.addWorktreeField(bugPath, worktreeConfig);
    if (!updateResult.ok) {
      // Rollback: remove the worktree we just created
      logger.warn('[BugWorkflowService] Failed to update bug.json, rolling back worktree', {
        error: updateResult.error,
      });
      await worktreeService.removeBugWorktree(bugName).catch(() => {
        logger.error('[BugWorkflowService] Rollback failed', { bugName });
      });
      return {
        ok: false,
        error: { type: 'GIT_ERROR', message: 'Failed to update bug.json' },
      };
    }

    logger.info('[BugWorkflowService] Bug worktree created successfully for auto-execution', {
      worktreeConfig,
    });

    return { ok: true, value: worktreeConfig };
  }
}
