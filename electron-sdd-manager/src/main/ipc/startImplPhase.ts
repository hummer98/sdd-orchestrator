/**
 * Unified Impl Start Phase Handler
 * Consolidates impl start logic from Renderer (handleImplExecute) and
 * Auto Execution (execute-next-phase) into a single Main Process function.
 *
 * impl-start-unification: Task 1.1, 1.2, 1.3
 * spec-worktree-early-creation: Task 7.3 - worktree作成ロジック削除
 * - Worktreeはspec作成時に既に作成されている
 * - 本関数ではworktree作成を行わない（既存worktreeを使用）
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
 * spec-worktree-early-creation: NOT_ON_MAIN_BRANCH, WORKTREE_CREATE_FAILED removed
 * (worktree is created at spec creation time, not impl start time)
 */
export type ImplStartErrorType =
  | 'SPEC_JSON_ERROR'
  | 'EXECUTE_FAILED';

/**
 * Error details for impl start failures
 * Requirements: 1.3
 * spec-worktree-early-creation: currentBranch field removed (NOT_ON_MAIN_BRANCH no longer used)
 */
export interface ImplStartError {
  type: ImplStartErrorType;
  message?: string;
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
 * Check if worktree mode is enabled (has path set in spec.json)
 * spec-worktree-early-creation: Simplified - worktree is already created at spec creation time
 */
function hasWorktreePath(worktree?: WorktreeConfig & { enabled?: boolean }): boolean {
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
// Main Function (Task 1.1, 1.3)
// spec-worktree-early-creation: Task 7.3 - worktree作成ロジック削除
// =============================================================

/**
 * Unified impl start function
 * spec-worktree-early-creation: Simplified
 * - Worktreeはspec作成時に既に作成されている
 * - 本関数ではworktree作成を行わない
 * - Worktreeモードの場合はspec.json.worktree.pathを使用
 * - 通常モードの場合はbranch/created_at情報を保存
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
  // spec-worktree-early-creation: Worktree作成ロジック削除
  // Worktreeはspec作成時に既に作成されているため、
  // 本関数ではworktree存在確認のみを行い、作成は行わない
  // =============================================================

  if (hasWorktreePath(specJson.worktree)) {
    // Worktree mode: worktree is already created at spec creation time
    logger.info('[startImplPhase] Worktree mode detected, using existing worktree', {
      path: specJson.worktree?.path,
      branch: specJson.worktree?.branch,
    });
  }

  // =============================================================
  // Normal Mode Processing: Save branch info if not initialized
  // =============================================================

  else if (!isNormalModeInitialized(specJson.worktree)) {
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
    // Already initialized normal mode
    logger.info('[startImplPhase] Using existing configuration', {
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
