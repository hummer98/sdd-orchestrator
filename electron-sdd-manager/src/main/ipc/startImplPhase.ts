/**
 * Unified Impl Start Phase Handler
 * Consolidates impl start logic from Renderer (handleImplExecute) and
 * Auto Execution (execute-next-phase) into a single Main Process function.
 *
 * impl-start-unification: Task 1.1, 1.2, 1.3
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { WorktreeService } from '../services/worktreeService';
import { logger } from '../services/logger';
import type { SpecManagerService, CommandPrefix } from '../services/specManagerService';
import type { WorktreeConfig } from '../../renderer/types/worktree';

// =============================================================
// Type Definitions (Task 1.1, Requirements 1.2, 1.3)
// =============================================================

/**
 * Parameters for startImplPhase function
 * Requirements: 1.2
 */
export interface StartImplParams {
  specPath: string;      // spec.json が存在するディレクトリパス
  featureName: string;   // 機能名（Worktree ブランチ名に使用）
  commandPrefix: CommandPrefix; // コマンドプレフィックス ('kiro' など)
  specManagerService: SpecManagerService; // Service for executing impl
}

/**
 * Error types for impl start failures
 * Requirements: 1.3
 */
export type ImplStartErrorType =
  | 'NOT_ON_MAIN_BRANCH'
  | 'WORKTREE_CREATE_FAILED'
  | 'SPEC_JSON_ERROR'
  | 'EXECUTE_FAILED';

/**
 * Error details for impl start failures
 * Requirements: 1.3
 */
export interface ImplStartError {
  type: ImplStartErrorType;
  message?: string;
  currentBranch?: string; // Set when type is NOT_ON_MAIN_BRANCH
}

/**
 * Result type for impl start operations
 * Requirements: 1.3
 */
export type ImplStartResult =
  | { ok: true; value: { agentId: string } }
  | { ok: false; error: ImplStartError };

// =============================================================
// Internal Helpers
// =============================================================

/**
 * Extended spec.json structure with worktree field
 */
interface SpecJsonWithWorktree {
  feature_name: string;
  phase?: string;
  worktree?: WorktreeConfig & { enabled?: boolean };
  [key: string]: unknown;
}

/**
 * Check if worktree mode is enabled (needs worktree creation)
 * Returns true only when enabled=true AND path is not set
 */
function isWorktreeModeEnabledAndNeedsCreation(worktree?: WorktreeConfig & { enabled?: boolean }): boolean {
  if (!worktree) return false;
  if (worktree.enabled !== true) return false;
  // If path is already set, worktree exists - no need to create
  if (worktree.path) return false;
  return true;
}

/**
 * Check if worktree already exists (has path set)
 */
function hasExistingWorktree(worktree?: WorktreeConfig & { enabled?: boolean }): boolean {
  return !!worktree?.path;
}

/**
 * Check if normal mode has been initialized (has branch but no path)
 */
function isNormalModeInitialized(worktree?: WorktreeConfig & { enabled?: boolean }): boolean {
  if (!worktree) return false;
  // Has branch set but no path means normal mode was already initialized
  return !!worktree.branch && !worktree.path;
}

// =============================================================
// Main Function (Task 1.1, 1.2, 1.3)
// Requirements: 1.1, 2.1, 2.2, 2.3
// =============================================================

/**
 * Unified impl start function
 * Consolidates Worktree mode logic (main branch check, worktree creation)
 * and normal mode logic (branch/created_at saving) into a single entry point.
 *
 * Requirements:
 * - 1.1: Branch based on worktree.enabled
 * - 2.1: Return NOT_ON_MAIN_BRANCH when worktree mode + not on main
 * - 2.2: Create worktree when worktree mode + on main
 * - 2.3: Skip branch check in normal mode
 *
 * @param params StartImplParams
 * @returns ImplStartResult
 */
export async function startImplPhase(params: StartImplParams): Promise<ImplStartResult> {
  const { specPath, featureName, commandPrefix, specManagerService } = params;

  logger.info('[startImplPhase] Starting impl phase', { specPath, featureName, commandPrefix });

  // Derive projectPath from specPath
  // specPath format: {projectPath}/.kiro/specs/{featureName}
  const projectPath = specPath.replace(/\/.kiro\/specs\/[^/]+$/, '');

  // Step 1: Read spec.json to determine mode
  let specJson: SpecJsonWithWorktree;
  try {
    const specJsonPath = path.join(specPath, 'spec.json');
    const content = await fs.readFile(specJsonPath, 'utf-8');
    specJson = JSON.parse(content);
    logger.debug('[startImplPhase] spec.json loaded', { worktree: specJson.worktree });
  } catch (error) {
    logger.error('[startImplPhase] Failed to read spec.json', { specPath, error });
    return {
      ok: false,
      error: {
        type: 'SPEC_JSON_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }

  const worktreeService = new WorktreeService(projectPath);

  // =============================================================
  // Task 1.2: Worktree Mode Processing (Requirements 2.1, 2.2)
  // =============================================================

  if (isWorktreeModeEnabledAndNeedsCreation(specJson.worktree)) {
    logger.info('[startImplPhase] Worktree mode enabled, checking main branch');

    // Check if on main branch (Requirement 2.1)
    const isMainResult = await worktreeService.isOnMainBranch();
    if (!isMainResult.ok) {
      logger.error('[startImplPhase] Failed to check main branch', { error: isMainResult.error });
      return {
        ok: false,
        error: {
          type: 'SPEC_JSON_ERROR',
          message: 'Failed to check current branch',
        },
      };
    }

    if (!isMainResult.value) {
      // Not on main branch - return error
      const branchResult = await worktreeService.getCurrentBranch();
      const currentBranch = branchResult.ok ? branchResult.value : 'unknown';
      logger.warn('[startImplPhase] Not on main branch', { currentBranch });
      return {
        ok: false,
        error: {
          type: 'NOT_ON_MAIN_BRANCH',
          currentBranch,
          message: `Worktreeモードはmainブランチでのみ使用できます。現在: ${currentBranch}`,
        },
      };
    }

    // On main branch - create worktree (Requirement 2.2)
    logger.info('[startImplPhase] On main branch, creating worktree', { featureName });
    const createResult = await worktreeService.createWorktree(featureName);
    if (!createResult.ok) {
      logger.error('[startImplPhase] Failed to create worktree', { error: createResult.error });
      // Get error message based on error type
      let errorMessage = 'Worktree creation failed';
      if (createResult.error.type === 'GIT_ERROR') {
        errorMessage = createResult.error.message;
      } else if (createResult.error.type === 'BRANCH_EXISTS') {
        errorMessage = `Branch already exists: ${createResult.error.branch}`;
      } else if (createResult.error.type === 'WORKTREE_EXISTS') {
        errorMessage = `Worktree already exists: ${createResult.error.path}`;
      }
      return {
        ok: false,
        error: {
          type: 'WORKTREE_CREATE_FAILED',
          message: errorMessage,
        },
      };
    }

    const worktreeInfo = createResult.value;

    // Create symlinks for logs preservation
    const symlinkResult = await worktreeService.createSymlinksForWorktree(
      worktreeInfo.absolutePath,
      featureName
    );
    if (!symlinkResult.ok) {
      logger.warn('[startImplPhase] Failed to create symlinks, continuing', {
        error: symlinkResult.error,
      });
    }

    // Update spec.json with worktree config
    try {
      const worktreeConfig: WorktreeConfig = {
        enabled: true,
        path: worktreeInfo.path,
        branch: worktreeInfo.branch,
        created_at: worktreeInfo.created_at,
      };
      specJson.worktree = worktreeConfig;
      await fs.writeFile(
        path.join(specPath, 'spec.json'),
        JSON.stringify(specJson, null, 2)
      );
      logger.info('[startImplPhase] spec.json updated with worktree config', { worktreeConfig });
    } catch (error) {
      // Rollback worktree on spec.json update failure
      logger.error('[startImplPhase] Failed to update spec.json, rolling back', { error });
      await worktreeService.removeWorktree(featureName).catch((e) => {
        logger.error('[startImplPhase] Rollback failed', { error: e });
      });
      return {
        ok: false,
        error: {
          type: 'SPEC_JSON_ERROR',
          message: 'Failed to update spec.json with worktree config',
        },
      };
    }
  }

  // =============================================================
  // Task 1.3: Normal Mode Processing (Requirement 2.3)
  // =============================================================

  else if (!hasExistingWorktree(specJson.worktree) && !isNormalModeInitialized(specJson.worktree)) {
    // Normal mode: Need to save branch and created_at
    logger.info('[startImplPhase] Normal mode, saving branch info');

    const branchResult = await worktreeService.getCurrentBranch();
    if (!branchResult.ok) {
      logger.error('[startImplPhase] Failed to get current branch', { error: branchResult.error });
      return {
        ok: false,
        error: {
          type: 'SPEC_JSON_ERROR',
          message: 'Failed to get current branch',
        },
      };
    }

    // Update spec.json with branch info (normal mode initialization)
    try {
      specJson.worktree = {
        ...specJson.worktree,
        branch: branchResult.value,
        created_at: new Date().toISOString(),
      };
      await fs.writeFile(
        path.join(specPath, 'spec.json'),
        JSON.stringify(specJson, null, 2)
      );
      logger.info('[startImplPhase] spec.json updated with branch info', {
        branch: branchResult.value,
      });
    } catch (error) {
      logger.error('[startImplPhase] Failed to update spec.json with branch info', { error });
      return {
        ok: false,
        error: {
          type: 'SPEC_JSON_ERROR',
          message: 'Failed to update spec.json with branch info',
        },
      };
    }
  } else {
    // Either existing worktree or already initialized normal mode
    logger.info('[startImplPhase] Using existing configuration', {
      hasWorktree: hasExistingWorktree(specJson.worktree),
      isInitialized: isNormalModeInitialized(specJson.worktree),
    });
  }

  // =============================================================
  // Execute impl phase
  // =============================================================

  logger.info('[startImplPhase] Executing impl phase');
  const executeResult = await specManagerService.execute({
    type: 'impl',
    specId: featureName,
    featureName,
    commandPrefix,
  });

  if (!executeResult.ok) {
    logger.error('[startImplPhase] Execute failed', { error: executeResult.error });
    // Get error message based on AgentError type
    let errorMessage = 'impl execution failed';
    const err = executeResult.error;
    if (err.type === 'SPAWN_ERROR' || err.type === 'PARSE_ERROR') {
      errorMessage = err.message;
    } else if (err.type === 'ALREADY_RUNNING') {
      errorMessage = `Agent already running for ${err.specId}/${err.phase}`;
    } else if (err.type === 'GROUP_CONFLICT') {
      errorMessage = `Group conflict: ${err.runningGroup} vs ${err.requestedGroup}`;
    } else if (err.type === 'SPEC_MANAGER_LOCKED') {
      errorMessage = `Spec manager locked by ${err.lockedBy}`;
    }
    return {
      ok: false,
      error: {
        type: 'EXECUTE_FAILED',
        message: errorMessage,
      },
    };
  }

  logger.info('[startImplPhase] Impl phase started successfully', {
    agentId: executeResult.value.agentId,
  });

  return {
    ok: true,
    value: { agentId: executeResult.value.agentId },
  };
}
